import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WorkoutHomeScreen from '../screens/WorkoutHomeScreen';
import TemplateBuilderScreen from '../screens/TemplateBuilderScreen';
import ActiveSessionScreen from '../screens/ActiveSessionScreen';
import SessionHistoryScreen from '../screens/SessionHistoryScreen';
import SessionDetailScreen from '../screens/SessionDetailScreen';

const Stack = createNativeStackNavigator();

function TrainingNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="WorkoutHome"
      screenOptions={{
        headerShown: false,
        animation: 'default',
      }}
    >
      <Stack.Screen name="WorkoutHome" component={WorkoutHomeScreen} />
      <Stack.Screen name="TemplateBuilder" component={TemplateBuilderScreen} />
      <Stack.Screen name="ActiveSession" component={ActiveSessionScreen} />
      <Stack.Screen name="SessionHistory" component={SessionHistoryScreen} />
      <Stack.Screen name="SessionDetail" component={SessionDetailScreen} />
    </Stack.Navigator>
  );
}

export default TrainingNavigator;
