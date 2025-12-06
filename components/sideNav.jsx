import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { StyleSheet } from 'react-native';
//import { Drawer } from 'react-native-paper';

import ProfileScreen from '../screens/ProfileScreen';
import HomeScreen from '../screens/HomeScreen';

const Drawer = createDrawerNavigator();

const SideNav = () => {
    return (
        
        <Drawer.Navigator
                drawerType="front"
                initialRouteName="Home"
                screenOptions={{
                    activeTintColor: '#e91e63',
                    itemStyle: { marginVertical: 10 },
       }}>
        
            <Drawer.Screen 
                name="Home" 
                component={HomeScreen} 
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

