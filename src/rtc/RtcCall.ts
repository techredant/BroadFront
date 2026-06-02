import {
  ChannelProfileType,
  ClientRoleType,
  ConnectionStateType,
  RemoteAudioState,
  RemoteVideoState,
  createAgoraRtcEngine,
  type IRtcEngine,
  type IRtcEngineEventHandler,
  AudienceLatencyLevelType,
} from "react-native-agora";
import { PermissionsAndroid, Platform } from "react-native";
import { fetchAgoraToken, emitLiveEvent } from "./agoraApi";
import { uidMatchesClerkId } from "@/utils/agoraUid";
import {
  RtcConnectionState,
  type RtcCallState,
  type RtcChannelKind,
  type RtcParticipant,
} from "./types";

type EventHandler = (payload?: unknown) => void;

let sharedEngine: IRtcEngine | null = null;
let engineAppId: string | null = null;

export function getSharedRtcEngine(): IRtcEngine | null {
  return sharedEngine;
}

export async function initSharedRtcEngine(appId: string): Promise<IRtcEngine> {
  if (sharedEngine && engineAppId === appId) return sharedEngine;

  if (sharedEngine) {
    try {
      sharedEngine.release();
    } catch {
      /* ignore */
    }
    sharedEngine = null;
  }

  const engine = createAgoraRtcEngine();
  engine.initialize({ appId });
  engine.enableAudio();
  sharedEngine = engine;
  engineAppId = appId;
  return engine;
}

export function releaseSharedRtcEngine() {
  if (!sharedEngine) return;
  try {
    sharedEngine.leaveChannel();
    sharedEngine.release();
  } catch {
    /* ignore */
  }
  sharedEngine = null;
  engineAppId = null;
}

async function ensureAndroidPermissions(isVideo: boolean) {
  if (Platform.OS !== "android") return;
  const perms = [
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    ...(isVideo ? [PermissionsAndroid.PERMISSIONS.CAMERA] : []),
  ];
  await PermissionsAndroid.requestMultiple(perms);
}

export class RtcCall {
  readonly id: string;
  readonly kind: RtcChannelKind;
  currentUserId: string;
  ringing = false;
  isCreatedByMe = false;

  state: RtcCallState = {
    callingState: RtcConnectionState.IDLE,
    custom: {},
    remoteParticipants: [],
    localParticipant: null,
    backstage: true,
    endedAt: null,
    createdBy: null,
    settings: {
      video: { enabled: true },
      screensharing: { enabled: true },
    },
    ownCapabilities: [],
    createdAt: Date.now(),
    speakingUids: [],
  };

  screenShare = {
    enabled: false,
    enable: async () => {
      this.screenShare.enabled = true;
      this.emitState();
    },
    disable: async (_force?: boolean) => {
      this.screenShare.enabled = false;
      this.emitState();
    },
  };

  private listeners = new Map<string, Set<EventHandler>>();
  private engine: IRtcEngine | null = null;
  private joinedUid = 0;
  private micEnabled = true;
  private cameraEnabled = true;
  private speakerOn = true;
  private audienceRole = false;
  private guestPublisher = false;
  private mutedRemoteUids = new Set<number>();

  camera = {
    state: { status: "disabled" as "enabled" | "disabled" },
    enable: async () => {
      this.cameraEnabled = true;
      this.camera.state.status = "enabled";
      this.engine?.enableVideo();
      this.engine?.startPreview();
      this.engine?.muteLocalVideoStream(false);
      this.emitState();
    },
    disable: async () => {
      this.cameraEnabled = false;
      this.camera.state.status = "disabled";
      this.engine?.muteLocalVideoStream(true);
      this.emitState();
    },
    toggle: async () => {
      if (this.cameraEnabled) await this.camera.disable();
      else await this.camera.enable();
    },
    flip: async () => {
      this.switchCamera();
    },
  };

  microphone = {
    state: { status: "disabled" as "enabled" | "disabled" },
    enable: async () => {
      this.micEnabled = true;
      this.microphone.state.status = "enabled";
      this.engine?.muteLocalAudioStream(false);
      this.emitState();
    },
    disable: async () => {
      this.micEnabled = false;
      this.microphone.state.status = "disabled";
      this.engine?.muteLocalAudioStream(true);
      this.emitState();
    },
    toggle: async () => {
      if (this.micEnabled) await this.microphone.disable();
      else await this.microphone.enable();
    },
  };

  constructor(id: string, kind: RtcChannelKind, userId: string) {
    this.id = id;
    this.kind = kind;
    this.currentUserId = userId;
  }

  on(event: string, handler: EventHandler) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  off(event: string, handler: EventHandler) {
    this.listeners.get(event)?.delete(handler);
  }

  private emit(event: string, payload?: unknown) {
    this.listeners.get(event)?.forEach((fn) => fn(payload));
  }

  private setCallingState(next: RtcConnectionState) {
    this.state.callingState = next;
    this.emitState();
  }

  private emitState() {
    this.emit("stateChanged");
  }

  private resolveClerkIdForUid(uid: number): string {
    const createdBy = this.state.createdBy?.id;
    if (uidMatchesClerkId(uid, createdBy)) return createdBy!;
    const hostFromCustom = this.state.custom?.hostUserId as string | undefined;
    if (uidMatchesClerkId(uid, hostFromCustom)) return hostFromCustom;
    const existing = this.state.remoteParticipants.find((p) => p.uid === uid);
    if (existing?.userId && !/^\d+$/.test(existing.userId)) {
      return existing.userId;
    }
    return String(uid);
  }

  private upsertRemoteParticipant(uid: number, patch: Partial<RtcParticipant> = {}) {
    const prev = this.state.remoteParticipants.find((p) => p.uid === uid);
    const participant: RtcParticipant = {
      userId: patch.userId ?? prev?.userId ?? this.resolveClerkIdForUid(uid),
      uid,
      name: patch.name ?? prev?.name,
      image: patch.image ?? prev?.image,
      hasAudio: patch.hasAudio ?? prev?.hasAudio ?? false,
      hasVideo: patch.hasVideo ?? prev?.hasVideo ?? false,
    };
    this.state.remoteParticipants = [
      ...this.state.remoteParticipants.filter((p) => p.uid !== uid),
      participant,
    ];
    return participant;
  }

  private patchRemoteParticipant(uid: number, patch: Partial<RtcParticipant>) {
    const prev = this.state.remoteParticipants.find((p) => p.uid === uid);
    if (!prev) {
      this.upsertRemoteParticipant(uid, patch);
      this.emitState();
      return;
    }
    Object.assign(prev, patch);
    this.emitState();
  }

  async get(_opts?: { ring?: boolean; video?: boolean }) {
    this.setCallingState(RtcConnectionState.RINGING);
    return this;
  }

  /** Reuse a prior ended/declined call object for a new incoming ring. */
  resetForIncomingRing(opts?: {
    callMode?: string;
    custom?: Record<string, unknown>;
  }) {
    if (opts?.custom) {
      this.state.custom = { ...opts.custom };
    } else if (opts?.callMode) {
      this.state.custom = { ...this.state.custom, callMode: opts.callMode };
    }
    this.state.endedAt = null;
    this.ringing = false;
    this.isCreatedByMe = false;
    this.state.remoteParticipants = [];
    this.state.localParticipant = null;
    this.state.backstage = true;
    this.setCallingState(RtcConnectionState.IDLE);
    if (getActiveRtcCall() === this) {
      setActiveRtcCall(null);
    }
  }

  async getOrCreate(opts?: {
    data?: {
      members?: Array<{ user_id: string; role?: string }>;
      custom?: Record<string, unknown>;
      channel_cid?: string;
    };
    ring?: boolean;
    video?: boolean;
  }) {
    if (opts?.data?.custom) this.state.custom = opts.data.custom;
    if (opts?.data?.channel_cid) {
      this.state.custom.channel_cid = opts.data.channel_cid;
    }
    this.isCreatedByMe = true;
    this.ringing = Boolean(opts?.ring);
    this.state.settings = {
      video: { enabled: opts?.video !== false },
    };
    this.state.createdBy = { id: this.currentUserId };
    this.state.ownCapabilities = [
      "update_call_permissions",
      "mute_users",
      "send_audio",
      "send_video",
      "screenshare",
    ];
    this.setCallingState(RtcConnectionState.RINGING);

    if (opts?.ring && opts?.data?.members?.length) {
      const { inviteCall } = await import("./agoraApi");
      await inviteCall({
        channelName: this.id,
        callerId: this.currentUserId,
        memberIds: opts.data.members.map((m) => m.user_id),
        callMode: opts?.video === false ? "audio" : "video",
        channelCid: opts?.data?.channel_cid,
      });
    }
    return this;
  }

  async join(opts?: {
    create?: boolean;
    video?: boolean;
    maxJoinRetries?: number;
    role?: "host" | "viewer" | "publisher" | "audience";
  }) {
    const isVideo = opts?.video !== false;
    this.state.settings = { video: { enabled: isVideo } };
    await this.joinChannel({
      role:
        opts?.role === "audience" || opts?.role === "viewer"
          ? "audience"
          : "publisher",
      isVideo,
      profile:
        this.kind === "live"
          ? ChannelProfileType.ChannelProfileLiveBroadcasting
          : ChannelProfileType.ChannelProfileCommunication,
    });
    return this;
  }

  async joinChannel(opts: {
    role: "publisher" | "audience";
    isVideo: boolean;
    profile?: ChannelProfileType;
    tokenContext?: string;
  }) {
    const engine = sharedEngine;
    if (!engine) throw new Error("RTC engine not initialized");

    this.engine = engine;
    this.setCallingState(RtcConnectionState.JOINING);

    await ensureAndroidPermissions(opts.isVideo);

    this.audienceRole = opts.role === "audience";
    this.guestPublisher = false;

    const tokenContext =
      opts.tokenContext ||
      (this.kind === "live"
        ? opts.role === "audience"
          ? "liveViewer"
          : "liveHost"
        : "call");

    const tokenRes = await fetchAgoraToken({
      channelName: this.id,
      userId: this.currentUserId,
      role: opts.role === "audience" ? "subscriber" : "publisher",
      context: tokenContext,
    });

    this.joinedUid = tokenRes.uid;

    engine.setChannelProfile(
      opts.profile ?? ChannelProfileType.ChannelProfileCommunication,
    );

    if (opts.profile === ChannelProfileType.ChannelProfileLiveBroadcasting) {
      if (opts.role === "audience") {
        engine.setClientRole(ClientRoleType.ClientRoleAudience, {
          audienceLatencyLevel:
            AudienceLatencyLevelType.AudienceLatencyLevelUltraLow,
        });
      } else {
        engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
      }
    }

    const handler: IRtcEngineEventHandler = {
      onJoinChannelSuccess: () => {
        this.setCallingState(RtcConnectionState.JOINED);
        this.state.backstage = false;

        if (opts.role === "audience" && !this.guestPublisher) {
          this.cameraEnabled = false;
          this.micEnabled = false;
          this.camera.state.status = "disabled";
          this.microphone.state.status = "disabled";
          engine.muteLocalAudioStream(true);
          engine.muteLocalVideoStream(true);
          this.state.localParticipant = {
            userId: this.currentUserId,
            uid: this.joinedUid,
            hasAudio: false,
            hasVideo: false,
          };
        } else {
          this.state.localParticipant = {
            userId: this.currentUserId,
            uid: this.joinedUid,
            hasAudio: this.micEnabled,
            hasVideo: this.cameraEnabled,
          };
          if (opts.isVideo) {
            void this.camera.enable();
          } else {
            void this.camera.disable();
          }
          void this.microphone.enable();
        }

        this.emit("call.session_participant_joined", {
          participant: { user: { id: this.currentUserId } },
        });
      },
      onUserJoined: (_connection, remoteUid) => {
        const participant = this.upsertRemoteParticipant(remoteUid, {
          hasVideo: false,
          hasAudio: false,
        });
        this.emit("call.session_participant_joined", {
          participant: { user: { id: participant.userId } },
        });
        this.emit("call.accepted", { user: { id: participant.userId } });
        this.emitState();
      },
      onRemoteVideoStateChanged: (_connection, remoteUid, state) => {
        const hasVideo =
          state === RemoteVideoState.RemoteVideoStateStarting ||
          state === RemoteVideoState.RemoteVideoStateDecoding ||
          state === RemoteVideoState.RemoteVideoStateFrozen;
        this.patchRemoteParticipant(remoteUid, { hasVideo });
      },
      onRemoteAudioStateChanged: (_connection, remoteUid, state) => {
        const hasAudio =
          state === RemoteAudioState.RemoteAudioStateStarting ||
          state === RemoteAudioState.RemoteAudioStateDecoding ||
          state === RemoteAudioState.RemoteAudioStateFrozen;
        this.patchRemoteParticipant(remoteUid, { hasAudio });
      },
      onAudioVolumeIndication: (_connection, speakers) => {
        const next: number[] = [];
        for (const speaker of speakers) {
          const uid = speaker.uid ?? 0;
          const volume = speaker.volume ?? 0;
          if (volume > 8 && uid >= 0) {
            next.push(uid);
          }
        }
        const prev = this.state.speakingUids ?? [];
        if (
          prev.length === next.length &&
          prev.every((uid, i) => uid === next[i])
        ) {
          return;
        }
        this.state.speakingUids = next;
        this.emitState();
      },
      onUserOffline: (_connection, remoteUid) => {
        this.state.remoteParticipants = this.state.remoteParticipants.filter(
          (p) => p.uid !== remoteUid,
        );
        if (
          this.kind === "call" &&
          this.state.callingState === RtcConnectionState.JOINED &&
          this.state.remoteParticipants.length === 0
        ) {
          void this.leave({ skipBackend: true });
        }
        this.emitState();
      },
      onConnectionStateChanged: (_connection, state) => {
        if (state === ConnectionStateType.ConnectionStateReconnecting) {
          this.setCallingState(RtcConnectionState.RECONNECTING);
        } else if (state === ConnectionStateType.ConnectionStateConnected) {
          if (this.state.callingState !== RtcConnectionState.LEFT) {
            this.setCallingState(RtcConnectionState.JOINED);
          }
        }
      },
    };

    engine.registerEventHandler(handler);

    engine.enableVideo();
    if (opts.role === "audience" && !this.guestPublisher) {
      /* Audience subscribes only — no local camera preview. */
    } else if (opts.isVideo) {
      engine.startPreview();
    } else {
      engine.disableVideo();
    }

    engine.setDefaultAudioRouteToSpeakerphone(this.speakerOn);
    engine.enableAudioVolumeIndication(300, 3, true);
    engine.joinChannel(tokenRes.token, this.id, tokenRes.uid, {
      clientRoleType:
        opts.role === "audience"
          ? ClientRoleType.ClientRoleAudience
          : ClientRoleType.ClientRoleBroadcaster,
      publishMicrophoneTrack: opts.role !== "audience",
      publishCameraTrack: opts.role !== "audience" && opts.isVideo,
      autoSubscribeAudio: true,
      autoSubscribeVideo: true,
    });

    return this;
  }

  async goLive() {
    this.state.backstage = false;
    this.emitState();
  }

  async stopLive() {
    this.state.backstage = true;
    this.emit("call.ended");
    this.emitState();
  }

  setDisconnectionTimeout(_ms: number) {}

  async update(opts: { custom?: Record<string, unknown> }) {
    if (opts.custom) {
      this.state.custom = { ...this.state.custom, ...opts.custom };
      this.state.updatedAt = Date.now();
    }
    this.emitState();
    return this;
  }

  async delete(_opts?: { hard?: boolean }) {
    const { endLiveSession } = await import("./agoraApi");
    await endLiveSession(this.id, this.currentUserId).catch(() => {});
    return this;
  }

  async requestPermissions(_opts: { permissions: string[] }) {
    await this.sendCustomEvent({
      type: "speak_request",
      userId: this.currentUserId,
    });
    return this;
  }

  async muteOthers(_type: "audio" | "video" = "audio") {
    for (const p of this.state.remoteParticipants) {
      await this.muteUser(p.userId, "audio");
    }
  }

  async unmuteUser(userId: string, _type: "audio" | "video" = "audio") {
    const participant = this.findParticipantByUserId(userId);
    if (!participant || !this.engine) return false;
    this.mutedRemoteUids.delete(participant.uid);
    this.engine.muteRemoteAudioStream(participant.uid, false);
    this.emitState();
    return true;
  }

  isUserMuted(userId: string): boolean {
    const participant = this.findParticipantByUserId(userId);
    return participant ? this.mutedRemoteUids.has(participant.uid) : false;
  }

  async endCall() {
    if (this.kind === "live") {
      return this.markLiveEnded({ hostEnd: true });
    }
    await this.leave();
  }

  /** End live for host (API + channel) or viewers (channel only). */
  async markLiveEnded(opts?: { hostEnd?: boolean; skipBackend?: boolean }) {
    if (this.state.endedAt != null) {
      this.emit("call.ended");
      return this;
    }

    if (opts?.hostEnd && !opts?.skipBackend) {
      const { endLiveSession } = await import("./agoraApi");
      await endLiveSession(this.id, this.currentUserId).catch(() => {});
    }

    this.setCallingState(RtcConnectionState.LEFT);
    this.state.endedAt = Date.now();
    this.ringing = false;
    try {
      this.engine?.leaveChannel();
    } catch {
      /* ignore */
    }
    if (getActiveRtcCall() === this) {
      setActiveRtcCall(null);
    }
    this.emit("call.ended");
    this.emitState();
    return this;
  }

  async leave(opts?: {
    reject?: boolean;
    reason?: string;
    /** Set when reacting to remote hangup to avoid duplicate API calls. */
    skipBackend?: boolean;
  }) {
    if (this.state.callingState === RtcConnectionState.LEFT) return this;

    const reason = opts?.reason ?? (opts?.reject ? "decline" : "hangup");

    if (!opts?.skipBackend && this.kind === "call") {
      const { endCall, declineCall } = await import("./agoraApi");
      if (
        opts?.reject &&
        (reason === "decline" || reason === "cancel" || reason === "busy")
      ) {
        await declineCall(
          this.id,
          this.currentUserId,
          reason as "decline" | "cancel" | "busy",
        ).catch(() => {});
      } else {
        await endCall(this.id, this.currentUserId, reason).catch(() => {});
      }
    }

    this.setCallingState(RtcConnectionState.LEFT);
    this.state.endedAt = Date.now();
    this.ringing = false;
    try {
      this.engine?.leaveChannel();
    } catch {
      /* ignore */
    }
    if (getActiveRtcCall() === this) {
      setActiveRtcCall(null);
    }
    if (opts?.reject) {
      this.emit("call.rejected", { reason: opts.reason });
    }
    this.emitState();
    return this;
  }

  private findParticipantByUserId(userId: string) {
    return this.state.remoteParticipants.find(
      (p) => p.userId === userId || uidMatchesClerkId(p.uid, userId),
    );
  }

  async muteUser(userId: string, _type: "audio" | "video" = "audio") {
    const participant = this.findParticipantByUserId(userId);
    if (!participant || !this.engine) return false;
    this.mutedRemoteUids.add(participant.uid);
    this.engine.muteRemoteAudioStream(participant.uid, true);
    this.emitState();
    return true;
  }

  async grantPermissions(_userId: string, caps: string[]) {
    this.state.ownCapabilities = [
      ...new Set([...(this.state.ownCapabilities ?? []), ...caps]),
    ];
    this.emitState();
    return this;
  }

  /** Upgrade a live viewer to on-stage guest (audio only — profile pic in strip, no camera). */
  async promoteAsLiveGuest(token: string, uid?: number) {
    if (!this.engine || this.kind !== "live") return this;

    this.guestPublisher = true;
    this.audienceRole = false;

    if (token) {
      this.engine.renewToken(token);
    }
    if (typeof uid === "number" && uid > 0) {
      this.joinedUid = uid;
    }

    this.engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
    this.engine.updateChannelMediaOptions({
      clientRoleType: ClientRoleType.ClientRoleBroadcaster,
      publishMicrophoneTrack: true,
      publishCameraTrack: false,
      autoSubscribeAudio: true,
      autoSubscribeVideo: true,
    });

    await this.camera.disable();
    await this.microphone.enable();

    if (this.state.localParticipant) {
      this.state.localParticipant.hasAudio = true;
      this.state.localParticipant.hasVideo = false;
    } else {
      this.state.localParticipant = {
        userId: this.currentUserId,
        uid: this.joinedUid,
        hasAudio: true,
        hasVideo: false,
      };
    }

    this.state.ownCapabilities = [
      ...(this.state.ownCapabilities ?? []),
      "send_audio",
    ];
    this.emitState();
    return this;
  }

  /** Return an on-stage guest to audience viewer (no publish). */
  async demoteToLiveViewer() {
    if (!this.engine || this.kind !== "live") return this;

    this.guestPublisher = false;
    this.audienceRole = true;

    await this.microphone.disable();
    await this.camera.disable();

    this.engine.setClientRole(ClientRoleType.ClientRoleAudience, {
      audienceLatencyLevel:
        AudienceLatencyLevelType.AudienceLatencyLevelUltraLow,
    });
    this.engine.updateChannelMediaOptions({
      clientRoleType: ClientRoleType.ClientRoleAudience,
      publishMicrophoneTrack: false,
      publishCameraTrack: false,
      autoSubscribeAudio: true,
      autoSubscribeVideo: true,
    });

    if (this.state.localParticipant) {
      this.state.localParticipant.hasAudio = false;
      this.state.localParticipant.hasVideo = false;
    }

    this.state.ownCapabilities = (this.state.ownCapabilities ?? []).filter(
      (c) => c !== "send_audio" && c !== "send_video",
    );
    this.emitState();
    return this;
  }

  async revokePermissions(_userId: string, _caps: string[]) {}

  async removeFromLive(_userId: string) {}

  async sendCustomEvent(event: { type: string; [key: string]: unknown }) {
    const typeMap: Record<string, string> = {
      live_chat: "live:chat",
      live_reaction: "live:reaction",
      live_join_ping: "live:join_ping",
      live_leave_ping: "live:leave_ping",
      speak_request: "live:speak_request",
      speak_invite: "live:guest_invite",
      speak_denied: "live:speak_denied",
      live_gift: "live:gift",
      live_donation: "live:donation",
      guest_on_stage: "live:guest_on_stage",
      guest_off_stage: "live:guest_off_stage",
      guest_muted: "live:guest_muted",
      guest_unmuted: "live:guest_unmuted",
    };
    const socketType = typeMap[event.type] || event.type;
    const enriched = {
      ...event,
      senderId: this.currentUserId,
      senderName:
        typeof event.senderName === "string" ? event.senderName : undefined,
    };

    // Guest invites use POST /live/guest/invite — not the broadcast live/event feed.
    if (socketType !== "live:guest_invite") {
      await emitLiveEvent(this.id, socketType, enriched);
    }

    this.emit("custom", {
      custom: enriched,
      user: {
        id: this.currentUserId,
        name:
          (typeof enriched.senderName === "string" && enriched.senderName) ||
          "You",
      },
    });

    return this;
  }

  setPreferredIncomingVideoResolution(_res: { width: number; height: number }) {}

  setIncomingVideoEnabled(_enabled: boolean) {}

  switchCamera() {
    this.engine?.switchCamera();
  }

  setSpeakerphone(enabled: boolean) {
    this.speakerOn = enabled;
    this.engine?.setEnableSpeakerphone(enabled);
  }

  isMicEnabled() {
    return this.micEnabled;
  }

  isCameraEnabled() {
    return this.cameraEnabled;
  }
}

export class AgoraRtcClient {
  userId: string;
  state = {
    calls: [] as RtcCall[],
  };

  constructor(userId: string) {
    this.userId = userId;
  }

  call(kind: RtcChannelKind | "default" | "livestream" | "audio_room", id: string) {
    const mapped: RtcChannelKind =
      kind === "default"
        ? "call"
        : kind === "livestream"
          ? "live"
          : kind === "audio_room"
            ? "audio_room"
            : kind;
    const existing = this.state.calls.find((c) => c.id === id);
    if (existing) {
      if (existing.state.callingState === RtcConnectionState.LEFT) {
        existing.resetForIncomingRing();
      }
      return existing;
    }
    const call = new RtcCall(id, mapped, this.userId);
    this.state.calls.push(call);
    return call;
  }

  on(_event: string, _handler: EventHandler) {
    return () => {};
  }

  async disconnectUser() {
    releaseSharedRtcEngine();
    this.state.calls = [];
  }
}

export const rtcDeviceManager = {
  start: (opts?: { audioRole?: string; deviceEndpointType?: string }) => {
    const call = getActiveRtcCall();
    if (!call) return;
    const speaker = opts?.deviceEndpointType === "speaker";
    call.setSpeakerphone(speaker);
  },
  stop: () => {},
};

let activeCallRef: RtcCall | null = null;

export function setActiveRtcCall(call: RtcCall | null) {
  activeCallRef = call;
}

export function getActiveRtcCall() {
  return activeCallRef;
}

export function isUserBusyInRtcCall(excludeChannelName?: string): boolean {
  if (!activeCallRef) return false;
  if (excludeChannelName && activeCallRef.id === excludeChannelName) return false;
  const st = activeCallRef.state.callingState;
  return (
    st === RtcConnectionState.JOINED ||
    st === RtcConnectionState.JOINING ||
    st === RtcConnectionState.RINGING ||
    st === RtcConnectionState.RECONNECTING
  );
}
