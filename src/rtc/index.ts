export * from "./types";
export * from "./agoraApi";
export * from "./agoraSignaling";
export {
  RtcCall,
  AgoraRtcClient,
  rtcDeviceManager,
  setActiveRtcCall,
  getActiveRtcCall,
  isUserBusyInRtcCall,
  getSharedRtcEngine,
  initSharedRtcEngine,
  releaseSharedRtcEngine,
} from "./RtcCall";
export {
  AgoraRtcProvider,
  RtcSessionProvider,
  useAgoraRtc,
  useStreamVideoClient,
  useRtcSession,
  useCall,
  useRtcState,
  useCallStateHooks,
} from "./AgoraRtcContext";

export const CallingState = {
  IDLE: "idle",
  RINGING: "ringing",
  JOINING: "joining",
  JOINED: "joined",
  RECONNECTING: "reconnecting",
  LEFT: "left",
} as const;

export const OwnCapability = {
  UPDATE_CALL_PERMISSIONS: "update_call_permissions",
  MUTE_USERS: "mute_users",
  SEND_AUDIO: "send_audio",
  SEND_VIDEO: "send_video",
  SCREENSHARE: "screenshare",
} as const;

import { rtcDeviceManager as deviceManager } from "./RtcCall";

export const callManager = {
  start: (opts?: Parameters<typeof deviceManager.start>[0]) => deviceManager.start(opts),
  stop: () => deviceManager.stop(),
};
