import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';


import SignInScreen from '../screen/SigninScreen.jsx';
import SignUpScreen from '../screen/SignupScreen.jsx';

const Stack = createStackNavigator();

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#0A2342',
    background: '#ffffff',
    text: '#0A2342',
  },
};

const App = () => {
  return (
    <PaperProvider theme={theme}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          
          <Stack.Screen name="SignInScreen" component={SignInScreen} />
          <Stack.Screen name="SignUpScreen" component={SignUpScreen} />
          
        </Stack.Navigator>
    </PaperProvider>
  );
};

export default App;