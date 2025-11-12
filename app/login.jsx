import React, { useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView } from "react-native";

import { LogInput } from "../components/LogInput";

export default function LoginScreen() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');

  return (
    <SafeAreaView style={styles.appContainer}>
      <View style={styles.form}>
        <LogInput
          label="Email cím"        // Ez lesz a címke
          value={name}      // Az aktuális érték
          onChangeText={setName} // A függvény, ami frissíti az értéket
        />
        
        <LogInput
          label="Jelszó"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address" // Átadhatsz bármilyen TextInput prop-ot
        />
      </View>
    </SafeAreaView>
    
  );
}

const styles = StyleSheet.create({
    appContainer: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    form: {
        paddingHorizontal: 20,
        paddingTop: 40,
    }
});


