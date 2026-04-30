import type { NavigatorScreenParams } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

export type AppScreenProps<T extends keyof AppStackParamList> =
    NativeStackScreenProps<AppStackParamList, T>;

// ── App (content) stack ─────────────────────────────────────────────────────
export type AppStackParamList = {
    AddServer: undefined;
    Channel: { channelID: string; channelName: string; serverID: string };
    ChannelList: { serverID: string; serverName?: string };
    Conversation: { userID: string; username: string };
    Devices: undefined;
    DMList: undefined;
    Invite: { serverID: string; serverName?: string };
    JoinGroup: undefined;
    OnboardingEmpty: undefined;
    ServerSettings: { serverID: string; serverName?: string };
    Settings: undefined;
};

// ── Screen prop helpers ─────────────────────────────────────────────────────
export type AuthScreenProps<T extends keyof AuthStackParamList> =
    NativeStackScreenProps<AuthStackParamList, T>;

// ── Auth stack ──────────────────────────────────────────────────────────────
export type AuthStackParamList = {
    Authenticate: undefined | { requestID?: string; username?: string };
    Finalize: { method: string };
    HangTight: undefined;
    Initialize: undefined;
    Login: undefined;
    Register: undefined;
    Welcome: undefined;
    WelcomeBack: undefined;
};

// ── DMsStack (legacy, used in DMsStack.tsx) ─────────────────────────────────
export type DMsStackParamList = {
    Conversation: { userID: string; username: string };
    DMList: undefined;
};

// ── Root stack (switches between Auth and App) ──────────────────────────────
export type RootStackParamList = {
    App: NavigatorScreenParams<AppStackParamList>;
    Auth: NavigatorScreenParams<AuthStackParamList>;
};

// ── ServersStack (legacy, used in ServersStack.tsx) ─────────────────────────
export type ServersStackParamList = {
    Channel: { channelID: string; channelName: string; serverID: string };
    ChannelList: { serverID: string; serverName?: string };
    ServerList: undefined;
};

// ── Global declaration so useNavigation() and navigationRef are typed ────────
declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace ReactNavigation {
        // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- React Navigation requires declaration merging
        interface RootParamList extends RootStackParamList {}
    }
}
