import { Stack } from 'expo-router';

export default function QuizLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Quiz Bíblico',
          headerTitleAlign: 'center',
        }} 
      />
    </Stack>
  );
}