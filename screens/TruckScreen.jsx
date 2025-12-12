import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';


const TruckScreen = () => {
  return (
    <View style={styles.container}>
        <Ionicons name="bus" size={80} color="#3b82f6" />
        <Text style={styles.text}>Truck Details</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B162C', justifyContent: 'center', alignItems: 'center' },
  text: { color: 'white', marginTop: 20 }
});

export default TruckScreen;