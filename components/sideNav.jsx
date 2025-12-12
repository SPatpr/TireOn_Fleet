import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { StyleSheet } from 'react-native';

import ProfileScreen from '../screens/ProfileScreen';
import BotNav from './botNav';

const Drawer = createDrawerNavigator();

const SideNav = () => {
    return (
        
        <Drawer.Navigator
                drawerType="front"
                initialRouteName="Home"
                screenOptions={{
                    headerShown: false,
                    drawerActiveTintColor: '#e91e63',
                    drawerItemStyle: { marginVertical: 10 },
       }}>
        
            <Drawer.Screen
                name="Home"
                component={BotNav}
                options={{ title: 'Home' }}
            />

            <Drawer.Screen
                name="Profile"
                component={ProfileScreen}
                options={{ title: 'Profilom' }}
            />
            
        </Drawer.Navigator>
            
    );
};


export default SideNav;

/*const styles = StyleSheet.create({
    container: {
      flex: 1, 
      backgroundColor: '#0A2342'
    },
});   */

