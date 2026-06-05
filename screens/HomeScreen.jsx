import { StyleSheet, Text, View } from "react-native";
import { Button } from "react-native-paper";
import { supabase } from "../lib/supabase";

const HomeScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Üdvözöllek a Főoldalon!</Text>
      <Button
        mode="contained"
        onPress={() => supabase.auth.signOut()}
        style={{ marginTop: 20 }}
      >
        Kijelentkezés
      </Button>
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A2342",
  },
  text: {
    color: "#fff",
  },
});
