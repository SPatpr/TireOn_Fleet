import { useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { Divider, List, Switch, Text, useTheme } from "react-native-paper";

// Ha van már ThemeContexted, akkor importáld be:
// import { useAppTheme } from '../context/ThemeContext';

const SettingsScreen = () => {
  const theme = useTheme();

  // Ha van Context, használd azt. Ha nincs, marad a helyi state ideiglenesen:
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  // const { isDarkTheme, toggleTheme } = useAppTheme(); // <--- Ha van Context

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Text
        variant="headlineMedium"
        style={[styles.header, { color: theme.colors.onBackground }]}
      >
        Beállítások
      </Text>

      <View style={styles.settingsContainer}>
        <List.Item
          title="Értesítések"
          description="Rendszerüzenetek kezelése"
          left={(props) => <List.Icon {...props} icon="bell-outline" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => console.log("Értesítések...")}
        />
        <Divider />

        <List.Item
          title="Sötét mód"
          description="Alkalmazás megjelenése"
          left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
          right={() => (
            <Switch
              value={isDarkTheme}
              onValueChange={() => {
                setIsDarkTheme(!isDarkTheme);
                // toggleTheme(); // <--- Ha van Context
                Alert.alert(
                  "Info",
                  "Itt váltana a téma, ha be van kötve a Context.",
                );
              }}
            />
          )}
        />
        <Divider />

        <List.Item
          title="Nyelv"
          description="Magyar"
          left={(props) => <List.Icon {...props} icon="web" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => console.log("Nyelv...")}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#0A2342",
  },
  header: {
    marginTop: 20,
    marginBottom: 20,
    fontWeight: "bold",
  },
  settingsContainer: {
    backgroundColor: "#0A2342",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(100, 100, 100, 0.2)",
  },
});

export default SettingsScreen;
