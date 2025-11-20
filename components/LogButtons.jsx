
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

/**
 * Egyéni, újrafelhasználható gomb.
 * @param {object} props
 * @param {string} props.title - A gomb felirata.
 * @param {function} props.onPress - A funkció, ami lefut kattintáskor.
 * @param {object} props.style - Opcionális külső stílus (pl. pozicionáláshoz).
 */
export function LogButton({ title, onPress, style }) {
    return (
        <TouchableOpacity style={[styles.button, style]} onPress={onPress}>
            <Text style={styles.buttonText}>{title}</Text>
        </TouchableOpacity>
    );
}

// Ezek a stílusok adják a gomb alap kinézetét (a te stílusod alapján)
const styles = StyleSheet.create({
    button: {
        backgroundColor: '#3a7bad', // A te színed
        borderRadius: 300,         // A te lekerekítésed
        paddingVertical: 12,       // Kicsit nagyobb, mint a 'padding: 10'
        paddingHorizontal: 25,     // Szélesebb, mint magas
        alignItems: 'center',    
        margin: 5,  // A szöveg középre zárása
        justifyContent: 'center',
    },
    buttonText: {
        color: '#ffffff',          // Fehér szöveg a kék háttéren
        fontSize: 16,
        fontWeight: 'bold',
    }
});

// Ne felejtsd el exportálni, ha nem default exportot használsz
// (Ha default, akkor: export default LogButton;)