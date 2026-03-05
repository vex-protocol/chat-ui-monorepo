import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { DMListScreen } from '../screens/DMListScreen'
import { ConversationScreen } from '../screens/ConversationScreen'

const Stack = createNativeStackNavigator()

export function DMsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1a1a1a' },
        headerTintColor: '#e8e8e8',
      }}
    >
      <Stack.Screen name="DMList" component={DMListScreen} options={{ title: 'Messages' }} />
      <Stack.Screen
        name="Conversation"
        component={ConversationScreen}
        options={({ route }: { route: any }) => ({ title: `@${route.params?.username ?? ''}` })}
      />
    </Stack.Navigator>
  )
}
