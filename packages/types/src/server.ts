export interface IServer {
  serverID: string
  name: string
  icon: string
}

export interface IChannel {
  channelID: string
  serverID: string
  name: string
}

export interface IPermission {
  permissionID: string
  userID: string
  resourceType: string
  resourceID: string
  powerLevel: number
}

export interface IInvite {
  inviteID: string
  serverID: string
  owner: string              // userID
  expiration: string | null  // ISO timestamp, null = never expires
}
