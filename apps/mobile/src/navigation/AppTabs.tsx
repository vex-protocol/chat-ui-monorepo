import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { DMsStack } from './DMsStack'
import { ServersStack } from './ServersStack'
import { SettingsScreen } from '../screens/SettingsScreen'

const Tab = createBottomTabNavigator()

export function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1a1a1a' },
        headerTintColor: '#e8e8e8',
        tabBarStyle: { backgroundColor: '#141414', borderTopColor: '#2a2a2a' },
        tabBarActiveTintColor: '#cc2a2a',
        tabBarInactiveTintColor: '#666666',
      }}
    >
      <Tab.Screen name="DMs" component={DMsStack} options={{ headerShown: false }} />
      <Tab.Screen name="Servers" component={ServersStack} options={{ headerShown: false }} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  )
}
