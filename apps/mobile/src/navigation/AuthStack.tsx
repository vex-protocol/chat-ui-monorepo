import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { WelcomeScreen } from '../screens/WelcomeScreen'
import { InitializeScreen } from '../screens/InitializeScreen'
import { FinalizeScreen } from '../screens/FinalizeScreen'
import { HangTightScreen } from '../screens/HangTightScreen'
import { WelcomeBackScreen } from '../screens/WelcomeBackScreen'
import { AuthenticateScreen } from '../screens/AuthenticateScreen'

const Stack = createNativeStackNavigator()

export function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Initialize" component={InitializeScreen} />
      <Stack.Screen name="Finalize" component={FinalizeScreen} />
      <Stack.Screen name="HangTight" component={HangTightScreen} />
      <Stack.Screen name="WelcomeBack" component={WelcomeBackScreen} />
      <Stack.Screen name="Authenticate" component={AuthenticateScreen} />
    </Stack.Navigator>
  )
}
