import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useStore } from '@nanostores/react'
import { $user } from '../store'
import { AuthStack } from './AuthStack'
import { AppTabs } from './AppTabs'

const Stack = createNativeStackNavigator()

export function RootNavigator() {
  const user = useStore($user)
  const isLoggedIn = user !== null

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isLoggedIn ? (
        <Stack.Screen name="App" component={AppTabs} />
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  )
}
