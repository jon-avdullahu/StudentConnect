import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
  fetchConversations,
  fetchMessageThread,
  sendChatMessage,
  inviteToTeam,
  acceptTeamInvitation,
  declineTeamInvitation,
  notifyTeamUpdated,
} from '../api';
import { useLocale } from '../context/LocaleContext';
import { useTeam } from '../context/TeamContext';

function parseMessageMetadata(msg) {
  const m = msg?.metadata;
  if (m == null) return null;
  if (typeof m === 'string') {
    try {
      return JSON.parse(m);
    } catch {
      return null;
    }
  }
  return m;
}

function readMe() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Landlord replying in a merged team thread: message the student who last wrote to you (fallback: URL anchor). */
function pickLandlordReplyRecipient(thread, landlordId, anchorStudentId) {
  const lid = Number(landlordId);
  for (let i = thread.length - 1; i >= 0; i--) {
    const m = thread[i];
    if (Number(m.receiver_id) === lid) {
      return Number(m.sender_id);
    }
  }
  return anchorStudentId;
}

/** When opening a landlord thread from the inbox (no ?listing=), infer listing from messages (e.g. teammate's team message). */
function pickListingIdFromThread(thread, landlordId) {
  if (!Array.isArray(thread) || landlordId == null || !Number.isFinite(Number(landlordId))) return null;
  const lid = Number(landlordId);
  let best = null;
  let bestTs = -1;
  for (const m of thread) {
    if (m.listing_id == null) continue;
    const sid = Number(m.sender_id);
    const rid = Number(m.receiver_id);
    if (sid !== lid && rid !== lid) continue;
    const ts = new Date(m.timestamp).getTime();
    if (!Number.isFinite(ts)) continue;
    if (ts >= bestTs) {
      bestTs = ts;
      best = String(m.listing_id);
    }
  }
  return best;
}

export default function Messages() {
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const listingId = searchParams.get('listing');
  const contactParam = searchParams.get('contact');
  const teamThreadParam = searchParams.get('team');
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLocale();
  const { team, refresh: refreshTeam } = useTeam();
  const seedPeerName = location.state?.peerName;

  const me = readMe();
  /** Primitives only — `readMe()` returns a new object every render; using `me` in effect deps caused an infinite API loop. */
  const myId = me?.id;
  const otherId = userId ? parseInt(userId, 10) : null;

  const [conversations, setConversations] = useState([]);
  const [thread, setThread] = useState([]);
  const [listing, setListing] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [invitingTeam, setInvitingTeam] = useState(false);
  const [joiningInvitationId, setJoiningInvitationId] = useState(null);
  const [decliningInvitationId, setDecliningInvitationId] = useState(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const [listingSendMode, setListingSendMode] = useState('self');

  const isStudent = String(me?.role || '')
    .toLowerCase()
    .trim() === 'student';
  const isLandlord = String(me?.role || '')
    .toLowerCase()
    .trim() === 'landlord';

  const threadFetchOpts = useMemo(
    () => (teamThreadParam ? { teamId: teamThreadParam } : {}),
    [teamThreadParam]
  );

  const listingIdFromThread = useMemo(
    () => pickListingIdFromThread(thread, isLandlord ? myId : otherId),
    [thread, otherId, myId, isLandlord]
  );
  const effectiveListingId = listingId || listingIdFromThread;

  const isStudentDm = !effectiveListingId && isStudent;
  const canSendAsTeam = Boolean(effectiveListingId && isStudent && team?.full);

  /** Persist listing in the URL so refresh/share keeps landlord context (teammate-opened threads). */
  useEffect(() => {
    if (listingId || !listingIdFromThread || !userId) return;
    const params = new URLSearchParams(location.search);
    if (params.get('listing') === listingIdFromThread) return;
    params.set('listing', listingIdFromThread);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  }, [listingId, listingIdFromThread, userId, location.pathname, location.search, navigate]);

  const inferredLandlordTeamId = useMemo(() => {
    if (!isLandlord || !thread.length) return null;
    for (let i = thread.length - 1; i >= 0; i--) {
      if (thread[i].team_id != null) return String(thread[i].team_id);
    }
    return null;
  }, [isLandlord, thread]);

  /** Persist ?team= for merged roommate threads so the sidebar stays in sync. */
  useEffect(() => {
    if (!isLandlord || teamThreadParam || !inferredLandlordTeamId || !userId) return;
    const params = new URLSearchParams(location.search);
    if (params.get('team') === inferredLandlordTeamId) return;
    params.set('team', inferredLandlordTeamId);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  }, [
    isLandlord,
    teamThreadParam,
    inferredLandlordTeamId,
    userId,
    location.pathname,
    location.search,
    navigate,
  ]);

  const loadConversations = useCallback(async () => {
    if (myId == null) return;
    setLoadingList(true);
    try {
      const data = await fetchConversations();
      setConversations(Array.isArray(data) ? data : []);
    } catch {
      setConversations([]);
    } finally {
      setLoadingList(false);
    }
  }, [myId]);

  useEffect(() => {
    if (myId == null) {
      const ret = `${location.pathname}${location.search || ''}`;
      navigate('/login', { replace: true, state: { from: ret } });
      return;
    }
    loadConversations();
  }, [myId, navigate, loadConversations, location.pathname, location.search]);

  useEffect(() => {
    if (myId == null || !otherId || !Number.isFinite(otherId)) {
      setThread([]);
      return;
    }
    if (Number(otherId) === Number(myId)) {
      navigate('/messages', { replace: true });
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingThread(true);
      setError('');
      try {
        const data = await fetchMessageThread(otherId, threadFetchOpts);
        if (!cancelled) setThread(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) {
          setError(e.message);
          setThread([]);
        }
      } finally {
        if (!cancelled) setLoadingThread(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [myId, otherId, navigate, threadFetchOpts]);

  /** Poll thread so the other party's messages appear without a full page refresh. */
  useEffect(() => {
    if (myId == null || !otherId || !Number.isFinite(otherId)) return;
    if (Number(otherId) === Number(myId)) return;

    let cancelled = false;
    const threadSig = (arr) => (Array.isArray(arr) ? arr.map((m) => m.id).join(',') : '');

    const refreshThread = async () => {
      if (cancelled) return;
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      try {
        const data = await fetchMessageThread(otherId, threadFetchOpts);
        if (cancelled) return;
        const next = Array.isArray(data) ? data : [];
        setThread((prev) => (threadSig(prev) === threadSig(next) ? prev : next));
      } catch {
        /* keep current messages on transient errors */
      }
    };

    const interval = setInterval(refreshThread, 4000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshThread();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [myId, otherId, threadFetchOpts]);

  useEffect(() => {
    if (!effectiveListingId) {
      setListing(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/listings/${effectiveListingId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.title) setListing(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [effectiveListingId]);

  useEffect(() => {
    if (!effectiveListingId) {
      setListingSendMode('self');
      return;
    }
    setListingSendMode(contactParam === 'team' ? 'team' : 'self');
  }, [effectiveListingId, contactParam]);

  useEffect(() => {
    if (listingSendMode === 'team' && !canSendAsTeam) {
      setListingSendMode('self');
    }
  }, [listingSendMode, canSendAsTeam]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread, loadingThread]);

  const landlordLabel =
    !isLandlord &&
    listing &&
    otherId &&
    Number(listing.owner_id) === Number(otherId) &&
    listing.owner_full_name
      ? String(listing.owner_full_name).trim()
      : null;

  const resolvePeerName = useCallback(
    (id) => {
      const row = conversations.find((x) => Number(x.other_user_id) === Number(id));
      if (row?.other_user_name) return row.other_user_name;
      if (Number(id) === Number(otherId)) {
        if (seedPeerName) return seedPeerName;
        if (landlordLabel) return landlordLabel;
      }
      return t('messages.peerFallback', { id });
    },
    [conversations, otherId, seedPeerName, landlordLabel, t]
  );

  const handleSend = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !otherId || myId == null) return;
    setSending(true);
    setError('');
    try {
      const receiverId = isLandlord
        ? pickLandlordReplyRecipient(thread, myId, otherId)
        : otherId;
      await sendChatMessage({
        receiver_id: receiverId,
        listing_id: effectiveListingId || undefined,
        content: text,
        as_team: Boolean(effectiveListingId && canSendAsTeam && listingSendMode === 'team'),
      });
      setDraft('');
      const data = await fetchMessageThread(otherId, threadFetchOpts);
      setThread(Array.isArray(data) ? data : []);
      await loadConversations();
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  const handleInviteTeam = async () => {
    if (!otherId || myId == null) return;
    setInvitingTeam(true);
    setError('');
    try {
      await inviteToTeam(otherId);
      notifyTeamUpdated();
      await refreshTeam();
      const data = await fetchMessageThread(otherId, threadFetchOpts);
      setThread(Array.isArray(data) ? data : []);
      await loadConversations();
    } catch (e) {
      setError(e.message);
    } finally {
      setInvitingTeam(false);
    }
  };

  const handleJoinTeam = async (invitationId) => {
    if (!otherId || invitationId == null) return;
    setJoiningInvitationId(invitationId);
    setError('');
    try {
      await acceptTeamInvitation(invitationId);
      notifyTeamUpdated();
      await refreshTeam();
      const data = await fetchMessageThread(otherId, threadFetchOpts);
      setThread(Array.isArray(data) ? data : []);
      await loadConversations();
    } catch (e) {
      setError(e.message);
    } finally {
      setJoiningInvitationId(null);
    }
  };

  const handleDeclineTeam = async (invitationId) => {
    if (!otherId || invitationId == null) return;
    setDecliningInvitationId(invitationId);
    setError('');
    try {
      await declineTeamInvitation(invitationId);
      const data = await fetchMessageThread(otherId, threadFetchOpts);
      setThread(Array.isArray(data) ? data : []);
      await loadConversations();
    } catch (e) {
      setError(e.message);
    } finally {
      setDecliningInvitationId(null);
    }
  };

  if (myId == null) return null;

  const showThread = Boolean(userId && Number.isFinite(otherId));
  const activeConvo = conversations.find((x) => {
    if (Number(x.other_user_id) !== Number(otherId)) return false;
    const rowTeam = x.thread_team_id != null ? String(x.thread_team_id) : '';
    const urlTeam = teamThreadParam || '';
    if (x.thread_team_id == null) return !urlTeam;
    return urlTeam ? rowTeam === urlTeam : true;
  });
  const peerName = showThread
    ? activeConvo?.other_user_name || resolvePeerName(otherId)
    : '';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-10 pb-24 min-h-[calc(100vh-5rem)]">
      <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-6 md:mb-8">{t('messages.title')}</h1>

      <div
        className={`grid gap-6 md:gap-8 ${showThread ? 'md:grid-cols-5' : 'md:grid-cols-1 max-w-xl'}`}
      >
        <div className={`${showThread ? 'md:col-span-2' : ''} ${showThread ? 'hidden md:block' : ''}`}>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{t('messages.conversations')}</h2>
            </div>
            {loadingList ? (
              <div className="p-6 space-y-3 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-slate-100 rounded-xl" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <p className="p-6 text-slate-500 font-medium text-sm">{t('messages.emptyList')}</p>
            ) : (
              <ul className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto">
                {conversations.map((c) => {
                  const rowTeam = c.thread_team_id != null ? String(c.thread_team_id) : '';
                  const urlTeam = teamThreadParam || '';
                  const active =
                    Number(c.other_user_id) === Number(otherId) &&
                    (c.thread_team_id == null ? !urlTeam : urlTeam ? rowTeam === urlTeam : true);
                  const unread = c.unread_for_me;
                  const convKey =
                    c.thread_team_id != null ? `team-${c.thread_team_id}` : `user-${c.other_user_id}`;
                  const toPath =
                    c.thread_team_id != null
                      ? `/messages/${c.other_user_id}?team=${c.thread_team_id}`
                      : `/messages/${c.other_user_id}`;
                  return (
                    <li key={convKey}>
                      <Link
                        to={toPath}
                        className={`flex flex-col gap-0.5 px-4 py-3 transition-colors ${
                          active ? 'bg-blue-50/80' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`font-bold truncate ${unread ? 'text-slate-900' : 'text-slate-700'}`}>
                            {c.other_user_name}
                          </span>
                          {c.last_message_time && (
                            <span className="text-xs text-slate-400 shrink-0 font-medium">
                              {new Date(c.last_message_time).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          )}
                        </div>
                        <p className={`text-sm truncate ${unread ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>
                          {c.last_message_content}
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {showThread && (
          <>
            <div className="md:hidden mb-2">
              <button
                type="button"
                onClick={() => navigate('/messages')}
                className="text-sm font-bold text-blue-600 hover:text-blue-700"
              >
                ← {t('messages.backToList')}
              </button>
            </div>

            <div className="md:col-span-3 flex flex-col bg-white rounded-2xl border border-slate-100 shadow-sm min-h-[420px] md:min-h-[560px] max-h-[75vh]">
              <div className="px-4 py-4 border-b border-slate-100 flex flex-col gap-2 shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-black text-slate-900 truncate">{peerName}</h2>
                  <Link
                    to="/messages"
                    className="hidden md:inline text-sm font-bold text-slate-400 hover:text-slate-600 shrink-0"
                  >
                    {t('messages.closeThread')}
                  </Link>
                </div>
                {listing?.title && (
                  <Link
                    to={`/listing/${listing.id}`}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 truncate"
                  >
                    {t('messages.aboutListing')}: {listing.title}
                  </Link>
                )}
              </div>

              {error && (
                <div className="mx-4 mt-3 text-sm font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {loadingThread ? (
                  <div className="space-y-3 animate-pulse">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className={`h-12 rounded-2xl max-w-[85%] ${i % 2 ? 'ml-auto bg-blue-100' : 'bg-slate-100'}`} />
                    ))}
                  </div>
                ) : thread.length === 0 ? (
                  <p className="text-center text-slate-500 font-medium py-12 text-sm">{t('messages.noMessagesYet')}</p>
                ) : (
                  thread.map((msg) => {
                    const mine = Number(msg.sender_id) === Number(myId);
                    const mt = msg.message_type || 'text';

                    if (mt === 'team_system') {
                      return (
                        <div key={msg.id} className="flex justify-center">
                          <div className="max-w-[92%] rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 shadow-sm">
                            <p className="text-sm font-medium text-emerald-900 text-center whitespace-pre-wrap break-words">
                              {msg.content}
                            </p>
                            <p className="text-[10px] mt-2 font-semibold text-emerald-700/80 text-center">
                              {new Date(msg.timestamp).toLocaleString(undefined, {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    }

                    if (mt === 'team_invite') {
                      const meta = parseMessageMetadata(msg);
                      const invId = meta?.invitation_id;
                      const st = msg.invitation_status || 'unknown';
                      const pending = st === 'pending';
                      const imInvitee = pending && !mine && Number(msg.receiver_id) === Number(myId);
                      const joining = joiningInvitationId != null && Number(joiningInvitationId) === Number(invId);

                      return (
                        <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm border ${
                              mine
                                ? 'bg-violet-600 text-white border-violet-500 rounded-br-md'
                                : 'bg-violet-50 text-violet-950 border-violet-200 rounded-bl-md'
                            }`}
                          >
                            {!mine && (
                              <p className="text-xs font-bold text-violet-600/90 mb-1">{msg.sender_name}</p>
                            )}
                            <p className="text-sm font-semibold whitespace-pre-wrap break-words">{msg.content}</p>
                            {mine && pending && (
                              <p className={`text-xs mt-2 font-semibold ${mine ? 'text-violet-100' : 'text-violet-700'}`}>
                                {t('messages.teamInviteWait')}
                              </p>
                            )}
                            {!mine && pending && (
                              <p className="text-xs mt-2 font-medium text-violet-800">{t('messages.teamInviteAcceptHint')}</p>
                            )}
                            {imInvitee && pending && invId != null && (
                              <div className="mt-3 flex gap-2">
                                <button
                                  type="button"
                                  disabled={joining || decliningInvitationId != null || Boolean(team?.full)}
                                  onClick={() => handleJoinTeam(invId)}
                                  className="flex-1 rounded-xl bg-violet-700 text-white text-sm font-black py-2.5 hover:bg-violet-800 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                                >
                                  {joining ? t('messages.joiningTeam') : t('messages.joinTeam')}
                                </button>
                                <button
                                  type="button"
                                  disabled={decliningInvitationId != null || joining}
                                  onClick={() => handleDeclineTeam(invId)}
                                  className="flex-1 rounded-xl bg-slate-200 text-slate-700 text-sm font-black py-2.5 hover:bg-slate-300 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                                >
                                  {decliningInvitationId != null && Number(decliningInvitationId) === Number(invId)
                                    ? t('team.declining')
                                    : t('team.decline')}
                                </button>
                              </div>
                            )}
                            {st === 'accepted' && (
                              <p className={`text-xs mt-2 font-bold ${mine ? 'text-violet-100' : 'text-violet-700'}`}>
                                {t('messages.teamInviteComplete')}
                              </p>
                            )}
                            <p
                              className={`text-[10px] mt-2 font-semibold ${mine ? 'text-violet-200' : 'text-violet-400'}`}
                            >
                              {new Date(msg.timestamp).toLocaleString(undefined, {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    }

                    const isListingTeamMsg =
                      (msg.message_type || 'text') === 'text' &&
                      msg.listing_id != null &&
                      msg.team_id != null;
                    return (
                      <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm ${
                            mine
                              ? 'bg-blue-600 text-white rounded-br-md'
                              : 'bg-slate-100 text-slate-800 rounded-bl-md'
                          }`}
                        >
                          {!mine && (
                            <p className="text-xs font-bold text-slate-500 mb-1">{msg.sender_name}</p>
                          )}
                          {isListingTeamMsg && (
                            <p
                              className={`text-[10px] font-black uppercase tracking-wide mb-1 ${
                                mine ? 'text-blue-100' : 'text-violet-700'
                              }`}
                            >
                              {msg.team_pair_label
                                ? t('messages.listingTeamBadge', { names: msg.team_pair_label })
                                : t('messages.listingTeamBadgeShort')}
                            </p>
                          )}
                          <p className="text-sm font-medium whitespace-pre-wrap break-words">{msg.content}</p>
                          <p
                            className={`text-[10px] mt-1 font-semibold ${mine ? 'text-blue-100' : 'text-slate-400'}`}
                          >
                            {new Date(msg.timestamp).toLocaleString(undefined, {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              <div className="shrink-0 border-t border-slate-100">
                {isStudentDm && (
                  <div className="px-4 pt-3">
                    <button
                      type="button"
                      disabled={invitingTeam || Boolean(team?.full) || !otherId}
                      onClick={handleInviteTeam}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl border-2 border-violet-200 bg-violet-50 text-violet-900 text-sm font-black hover:bg-violet-100 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                    >
                      {invitingTeam ? t('messages.invitingTeam') : t('messages.inviteToTeam')}
                    </button>
                    {team?.full && (
                      <p className="text-xs font-semibold text-slate-500 mt-2">{t('nav.teamFullHint')}</p>
                    )}
                  </div>
                )}
                {effectiveListingId && isStudent && canSendAsTeam && (
                  <div className="px-4 pt-3">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                      {t('messages.listingSendModeLabel')}
                    </p>
                    <div className="flex rounded-xl border border-slate-200 p-1 bg-slate-50 gap-1 max-w-md">
                      <button
                        type="button"
                        onClick={() => setListingSendMode('self')}
                        className={`flex-1 rounded-lg py-2.5 text-sm font-black transition-colors ${
                          listingSendMode === 'self'
                            ? 'bg-white text-blue-700 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {t('messages.sendAsSelf')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setListingSendMode('team')}
                        className={`flex-1 rounded-lg py-2.5 text-sm font-black transition-colors ${
                          listingSendMode === 'team'
                            ? 'bg-violet-600 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {t('messages.sendAsTeam')}
                      </button>
                    </div>
                  </div>
                )}
                <form onSubmit={handleSend} className="p-4 flex gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={t('messages.placeholder')}
                  rows={2}
                  className="flex-1 resize-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="self-end px-5 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold shadow-md shadow-blue-500/25 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none transition-all"
                >
                  {sending ? t('messages.sending') : t('messages.send')}
                </button>
              </form>
              </div>
            </div>
          </>
        )}

        {!showThread && (
          <div className="md:max-w-xl bg-slate-50/80 rounded-2xl border border-dashed border-slate-200 p-8 text-center">
            <p className="text-slate-600 font-medium">{t('messages.pickOrStart')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
