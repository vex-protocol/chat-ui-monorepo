import { createNavigationContainerRef } from '@react-navigation/native'

export const navigationRef = createNavigationContainerRef()

export function navigateToConversation(userID: string, username: string): void {
  if (!navigationRef.isReady()) return
  // Navigate into the DMs tab, then to the Conversation screen
  ;(navigationRef as any).navigate('DMs', {
    screen: 'Conversation',
    params: { userID, username },
  })
}
