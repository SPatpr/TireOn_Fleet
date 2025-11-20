// FloatingLabelInput.js

import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput, Animated, StyleSheet, Easing } from 'react-native';

export function LogInput({ label, value, onChangeText, ...props }) {

  const [isFocused, setIsFocused] = useState(false);
  
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  const isUp = isFocused || (value && value.length > 0);

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: isUp ? 1 : 0,
      duration: 200,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: false,
    }).start();
  }, [isUp]);

  const labelTop = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0],
  });

  const labelFontSize = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 12],
  });


  const labelColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['#9e9e9e', '#555'],
  });

  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);

  return (
    <View style={styles.container}>
      <Animated.Text style={[
        styles.label,
        { top: labelTop, fontSize: labelFontSize, color: labelColor }
      ]}>
        {label}
      </Animated.Text>
      
      <TextInput
        {...props} 
        value={value}
        onChangeText={onChangeText}
        onFocus={handleFocus}
        autoCapitalize="none"
        onBlur={handleBlur}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
    marginVertical: 10,
    position: 'relative',
  },
  label: {
    position: 'absolute',
    left: 0,

  },
  input: {
    fontSize: 16,
    color: '#000',
    height: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingTop: 8,
    paddingBottom: 4,
  },
});