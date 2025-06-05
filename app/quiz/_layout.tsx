import { Stack } from 'expo-router';

export default function QuizLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Quiz Bíblico',
          headerTitleAlign: 'center',
          headerShown: false
        }} 
      />
      <Stack.Screen 
        name="challenge" 
        options={{ 
          title: 'Challenge Mode',
          headerTitleAlign: 'center',
          headerShown: false
        }} 
      />
      <Stack.Screen 
        name="time-attack" 
        options={{ 
          title: 'Time Attack',
          headerTitleAlign: 'center',
          headerShown: false
        }} 
      />
    </Stack>
  );
}
