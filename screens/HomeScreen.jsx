import { StyleSheet, Text, View } from 'react-native';
import { Button } from 'react-native-paper';
import { signOut } from '../api/authAPI';

const HomeScreen = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Üdvözöllek a Főoldalon!</Text>
        <Button mode="contained" onPress={signOut}>
            Kijelentkezés
        </Button>
        </View>
        
    );
};

export default HomeScreen;

const styles = StyleSheet.create({ 
    container: {
      flex: 1, 
      backgroundColor: '#0A2342',
    },
    text: {
        color: '#fff',
    },
});