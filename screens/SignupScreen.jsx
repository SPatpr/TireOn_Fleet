import { Feather, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import { signUpNewCompany } from '../api/authAPI';

const SignUpScreen = ({navigation}) => {

    const viewRef = React.useRef(null);

    const handleRegister = async () => {
    if ( !data.email || !data.password || !data.companyName || !data.fullName || !data.taxId ) {
        Alert.alert('Hiba', 'Kérlek tölts ki minden mezőt!');
        return;
    }

    try {
        await signUpNewCompany({
            email: data.email,
            password: data.password,
            fullName: data.fullName,
            companyName: data.companyName,
            taxId: data.taxId
        });

        Alert.alert('Siker!', 'A fiók sikeresen létrejött.', [
            { text: 'OK', onPress: () => navigation.navigate('SignInScreen') }
        ]);
        
        // MEGJEGYZÉS: Ha az App.js-ben beállítottad az automatikus beléptetést,
        // akkor lehet, hogy a navigation.navigate sem kell, mert az App.js 
        // magától átvált a főoldalra, amint érzékeli a belépést.

    } catch (error) {
        Alert.alert('Regisztrációs hiba', error.message);
    }
};

    const [data, setData] = React.useState({
        fullName: '',
        companyName: '',
        taxId: '',
        email: '',
        password: '',
        secureTextEntry: true,
    });

    const textInputChange = (val, field) => {
        setData({
            ...data,
            [field]: val
        });
    }

    const updateSecureTextEntry = () => {
        setData({
            ...data,
            secureTextEntry: !data.secureTextEntry
        });
    }

    const handleSignInPress = () => {
        if (viewRef.current) {
            viewRef.current.fadeOutDownBig(500).then(() => {
                navigation.goBack();
            });
        }
    };

    return (
      <View style={styles.container}>
          <StatusBar backgroundColor='#0A2342' barStyle="light-content"/>
        <View style={styles.header}>
            <Text style={styles.text_header}>Partner Regisztráció</Text>
        </View>
        <Animatable.View 
            ref={viewRef}
            animation="fadeInUpBig"
            style={styles.footer}
        >
            <ScrollView showsVerticalScrollIndicator={false}>
            
            <Text style={styles.text_footer}>Teljes Név</Text>
            <View style={styles.action}>
                <FontAwesome 
                    name="user-o"
                    color="#0A2342"
                    size={20}
                />
                <TextInput 
                    placeholder="Pl. Nagy Gábor"
                    placeholderTextColor="#666666"
                    style={styles.textInput}
                    autoCapitalize="words"
                    onChangeText={(val) => textInputChange(val, 'fullName')}
                />
            </View>

            <Text style={[styles.text_footer, { marginTop: 20 }]}>Cég Hivatalos Neve</Text>
            <View style={styles.action}>
                <FontAwesome 
                    name="building-o"
                    color="#0A2342"
                    size={20}
                />
                <TextInput 
                    placeholder="Pl. Trans-Logisztika Kft."
                    placeholderTextColor="#666666"
                    style={styles.textInput}
                    autoCapitalize="words"
                    onChangeText={(val) => textInputChange(val, 'companyName')}
                />
            </View>

            <Text style={[styles.text_footer, { marginTop: 20 }]}>Adószám</Text>
            <View style={styles.action}>
                <FontAwesome 
                    name="id-card-o"
                    color="#0A2342"
                    size={20}
                />
                <TextInput 
                    placeholder="Pl. 12345678-1-42"
                    placeholderTextColor="#666666"
                    style={styles.textInput}
                    autoCapitalize="none"
                    keyboardType="numeric"
                    onChangeText={(val) => textInputChange(val, 'taxId')}
                />
            </View>

            <Text style={[styles.text_footer, { marginTop: 20 }]}>Email Cím</Text>
            <View style={styles.action}>
                <Feather 
                    name="mail"
                    color="#0A2342"
                    size={20}
                />
                <TextInput 
                    placeholder="Az email címed"
                    placeholderTextColor="#666666"
                    style={styles.textInput}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    onChangeText={(val) => textInputChange(val, 'email')}
                />
            </View>

            <Text style={[styles.text_footer, { marginTop: 20 }]}>Jelszó</Text>
            <View style={styles.action}>
                <Feather 
                    name="lock"
                    color="#0A2342"
                    size={20}
                />
                <TextInput 
                    placeholder="Jelszó"
                    placeholderTextColor="#666666"
                    secureTextEntry={data.secureTextEntry ? true : false}
                    style={styles.textInput}
                    autoCapitalize="none"
                    onChangeText={(val) => textInputChange(val, 'password')}
                />
                <TouchableOpacity
                    onPress={updateSecureTextEntry}
                >
                    {data.secureTextEntry ? 
                    <Feather 
                        name="eye-off"
                        color="grey"
                        size={20}
                    />
                    :
                    <Feather 
                        name="eye"
                        color="grey"
                        size={20}
                    />
                    }
                </TouchableOpacity>
            </View>

            <View style={styles.textPrivate}>
                <Text style={styles.color_textPrivate}>
                    A regisztrációval elfogadod az
                </Text>
                <Text style={[styles.color_textPrivate, {fontWeight: 'bold', color: '#0A2342'}]}>{" "}Általános Szerződési Feltételeket</Text>
                <Text style={styles.color_textPrivate}>{" "}és az</Text>
                <Text style={[styles.color_textPrivate, {fontWeight: 'bold', color: '#0A2342'}]}>{" "}Adatvédelmi Irányelveket</Text>
            </View>
            
            <View style={styles.button}>
                <TouchableOpacity
                    style={styles.signIn}
                    onPress={handleRegister}
                >
                <LinearGradient
                    colors={['#0A2342', '#0A2342']}
                    style={styles.signIn}
                >
                    <Text style={[styles.textSign, {
                        color:'#fff'
                    }]}>Fiók Létrehozása</Text>
                </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleSignInPress}
                    style={[styles.signIn, {
                        borderColor: '#0A2342',
                        borderWidth: 1,
                        marginTop: 15
                    }]}
                >
                    <Text style={[styles.textSign, {
                        color: '#0A2342'
                    }]}>Belépés</Text>
                </TouchableOpacity>
            </View>
            </ScrollView>
        </Animatable.View>
      </View>
    );
};

export default SignUpScreen;

const styles = StyleSheet.create({
    container: {
      flex: 1, 
      backgroundColor: '#0A2342'
    },
    header: {
        flex: 1,
        justifyContent: 'flex-end',
        paddingHorizontal: 20,
        paddingBottom: 50
    },
    footer: {
        flex: Platform.OS === 'ios' ? 3 : 5,
        backgroundColor: '#fff',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingHorizontal: 20,
        paddingVertical: 30
    },
    text_header: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 30
    },
    text_footer: {
        color: '#0A2342',
        fontSize: 18
    },
    action: {
        flexDirection: 'row',
        marginTop: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f2f2f2',
        paddingBottom: 5
    },
    textInput: {
        flex: 1,
        marginTop: Platform.OS === 'ios' ? 0 : -12,
        paddingLeft: 10,
        color: '#0A2342',
    },
    button: {
        alignItems: 'center',
        marginTop: 50,
        marginBottom: 20
    },
    signIn: {
        width: '100%',
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10
    },
    textSign: {
        fontSize: 18,
        fontWeight: 'bold'
    },
    textPrivate: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 20
    },
    color_textPrivate: {
        color: 'grey'
    }
  });