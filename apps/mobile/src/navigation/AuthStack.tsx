import React, { useState, useEffect } from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { loadCredentials } from '../lib/keychain'
import { WelcomeScreen } from '../screens/WelcomeScreen'
import { InitializeScreen } from '../screens/InitializeScreen'
import { FinalizeScreen } from '../screens/FinalizeScreen'
import { HangTightScreen } from '../screens/HangTightScreen'
import { WelcomeBackScreen } from '../screens/WelcomeBackScreen'
import { AuthenticateScreen } from '../screens/AuthenticateScreen'
import { LoginScreen } from '../screens/LoginScreen'

const Stack = createNativeStackNavigator()

export function AuthStack() {
  const [initialRoute, setInitialRoute] = useState<string | null>(null)

  useEffect(() => {
    loadCredentials().then((creds) => {
      setInitialRoute(creds ? 'WelcomeBack' : 'Welcome')
    })
  }, [])

  if (!initialRoute) return null // brief wait while checking keychain

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
      <Stack.Screen name="Welcome" component={WelcomeScreen as any} />
      <Stack.Screen name="Initialize" component={InitializeScreen as any} />
      <Stack.Screen name="Finalize" component={FinalizeScreen as any} />
      <Stack.Screen name="HangTight" component={HangTightScreen} />
      <Stack.Screen name="WelcomeBack" component={WelcomeBackScreen as any} />
      <Stack.Screen name="Authenticate" component={AuthenticateScreen as any} />
      <Stack.Screen name="Login" component={LoginScreen as any} />
    </Stack.Navigator>
  )
}
