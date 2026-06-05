import { Feather, FontAwesome } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useRef } from "react";
import {
    Alert,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import * as Animatable from "react-native-animatable";
import { SignIn } from "../api/authAPI";

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const SignInScreen = ({ navigation }) => {
  const viewRef = useRef(null);
  const [loading, setLoading] = React.useState(false);

  const [data, setData] = React.useState({
    email: "",
    password: "",
    secureTextEntry: true,
  });

  const textInputChange = (val, field) => {
    setData({ ...data, [field]: val });
  };

  const handleRegister = async () => {
    if (!data.email || !data.password) {
      Alert.alert("Hiba", "Kérlek tölts ki minden mezőt!");
      return;
    }
    if (!isValidEmail(data.email)) {
      Alert.alert("Hiba", "Kérlek adj meg érvényes email címet!");
      return;
    }

    setLoading(true);
    try {
      await SignIn({ email: data.email, password: data.password });
    } catch (error) {
      Alert.alert("Bejelentkezés sikertelen", "Helytelen email vagy jelszó.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (viewRef.current) {
        viewRef.current.fadeInUpBig();
      }
    }, []),
  );

  const handleSignUpPress = () => {
    navigation.replace("SignUp");
  };

  const updateSecureTextEntry = () => {
    setData({
      ...data,
      secureTextEntry: !data.secureTextEntry,
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#0A2342" barStyle="light-content" />

      <View style={styles.header}>
        <Animatable.Text
          animation="fadeInLeft"
          duration={1000}
          style={styles.text_header}
        >
          Welcome!
        </Animatable.Text>
      </View>

      <Animatable.View
        ref={viewRef}
        animation="fadeInUpBig"
        style={[
          styles.footer,
          {
            backgroundColor: "#fff",
          },
        ]}
      >
        <Text
          style={[
            styles.text_footer,
            {
              color: "#0A2342",
            },
          ]}
        >
          Email Cím
        </Text>
        <View style={styles.action}>
          <FontAwesome name="mail" color="#0A2342" size={20} />
          <TextInput
            placeholder="Az email címed"
            placeholderTextColor="#666666"
            style={styles.textInput}
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={(val) => textInputChange(val, "email")}
          />
        </View>

        <Text
          style={[
            styles.text_footer,
            {
              color: "#0A2342",
              marginTop: 35,
            },
          ]}
        >
          Jelszó
        </Text>
        <View style={styles.action}>
          <Feather name="lock" color="#0A2342" size={20} />
          <TextInput
            placeholder="Jelszó"
            placeholderTextColor="#666666"
            secureTextEntry={data.secureTextEntry}
            style={styles.textInput}
            autoCapitalize="none"
            onChangeText={(val) => textInputChange(val, "password")}
          />
          <TouchableOpacity onPress={updateSecureTextEntry}>
            {data.secureTextEntry ? (
              <Feather name="eye-off" color="grey" size={20} />
            ) : (
              <Feather name="eye" color="grey" size={20} />
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity>
          <Text style={{ color: "#0A2342", marginTop: 15 }}>
            Forgot password?
          </Text>
        </TouchableOpacity>

        <View style={styles.button}>
          <TouchableOpacity
            onPress={handleRegister}
            style={[styles.signIn, loading && { opacity: 0.7 }]}
            disabled={loading}
          >
            <LinearGradient colors={["#0A2342", "#0A2342"]} style={styles.signIn}>
              <Text style={[styles.textSign, { color: "#fff" }]}>
                {loading ? "Bejelentkezés..." : "Sign In"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSignUpPress}
            style={[
              styles.signIn,
              {
                borderColor: "#0A2342",
                borderWidth: 1,
                marginTop: 15,
              },
            ]}
          >
            <Text
              style={[
                styles.textSign,
                {
                  color: "#0A2342",
                },
              ]}
            >
              Sign Up
            </Text>
          </TouchableOpacity>
        </View>
      </Animatable.View>
    </View>
  );
};

export default SignInScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A2342",
  },
  header: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 50,
  },
  footer: {
    flex: 3,
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  text_header: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 30,
  },
  text_footer: {
    color: "#0A2342",
    fontSize: 18,
  },
  action: {
    flexDirection: "row",
    marginTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f2f2f2",
    paddingBottom: 5,
  },
  actionError: {
    flexDirection: "row",
    marginTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#FF0000",
    paddingBottom: 5,
  },
  textInput: {
    flex: 1,
    marginTop: Platform.OS === "ios" ? 0 : -12,
    paddingLeft: 10,
    color: "#0A2342",
  },
  errorMsg: {
    color: "#FF0000",
    fontSize: 14,
  },
  button: {
    alignItems: "center",
    marginTop: 50,
  },
  signIn: {
    width: "100%",
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
  textSign: {
    fontSize: 18,
    fontWeight: "bold",
  },
});
