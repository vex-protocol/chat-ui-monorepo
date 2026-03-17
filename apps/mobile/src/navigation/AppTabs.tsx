import React, { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useStore } from '@nanostores/react'
import { $familiars } from '../store'
import { colors } from '../theme'
import { ServerSidebar } from '../components/ServerSidebar'
import { DMListScreen } from '../screens/DMListScreen'
import { ConversationScreen } from '../screens/ConversationScreen'
import { ChannelListScreen } from '../screens/ChannelListScreen'
import { ChannelScreen } from '../screens/ChannelScreen'
import { SettingsScreen } from '../screens/SettingsScreen'
import { OnboardingEmptyScreen } from '../screens/OnboardingEmptyScreen'

const Stack = createNativeStackNavigator()

function ContentStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DMList" component={DMListScreen} />
      <Stack.Screen name="Conversation" component={ConversationScreen} />
      <Stack.Screen name="ChannelList" component={ChannelListScreen} />
      <Stack.Screen name="Channel" component={ChannelScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="OnboardingEmpty" component={OnboardingEmptyScreen} />
    </Stack.Navigator>
  )
}

export function AppTabs() {
  const insets = useSafeAreaInsets()
  const [activeServerId, setActiveServerId] = useState<string | null>(null)
  const familiars = useStore($familiars)
  const hasFamiliars = Object.keys(familiars).length > 0

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ServerSidebar
        activeServerId={activeServerId}
        onSelectServer={(id) => setActiveServerId(id)}
        onSelectHome={() => setActiveServerId(null)}
        onSettings={() => {}}
      />
      <View style={styles.content}>
        <ContentStack />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
  },
})
