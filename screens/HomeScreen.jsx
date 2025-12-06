import React from 'react';
import { View, StyleSheet, Text } from 'react-native'; 
import SideNav from '../components/sideNav';

const HomeScreen = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Üdvözöllek a Főoldalon!</Text>
        </View>
    );
};

export default HomeScreen;

const styles = StyleSheet.create({ 
    container: {
      flex: 1, 
      backgroundColor: '#0A2342'
    },
});