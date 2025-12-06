import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';


import SignInScreen from '../screens/SigninScreen.jsx';
import SignUpScreen from '../screens/SignupScreen.jsx';
import SideNav from '../components/sideNav.jsx';

const Stack = createStackNavigator();

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#0A2342',
    background: '#0A2342',
    text: '#0A2342',
  },
};

const App = () => {
  return (
    <PaperProvider theme={theme}>
        <Stack.Navigator 
            screenOptions={{ 
                headerShown: false,
                cardStyle: { backgroundColor: '#0A2342' } 
            }}>
          
          <Stack.Screen name="SignInScreen" component={SignInScreen} />
          <Stack.Screen name="SignUpScreen" component={SignUpScreen} />
          <Stack.Screen name="HomeScreen" component={SideNav} />
          
        </Stack.Navigator>
    </PaperProvider>
  );
};

export default App;