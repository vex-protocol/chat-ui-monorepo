import React from "react";
import { View, StyleSheet } from "react-native";
import { colors } from "../theme";

interface PrivacyMeterProps {
    level: 1 | 2 | 3 | 4;
}

export function PrivacyMeter({ level }: PrivacyMeterProps) {
    return (
        <View style={styles.container}>
            {[1, 2, 3, 4].map((i) => (
                <View
                    key={i}
                    style={[
                        styles.bar,
                        i <= level ? styles.filled : styles.unfilled,
                    ]}
                />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        gap: 3,
        alignItems: "center",
    },
    bar: {
        width: 8,
        height: 14,
        borderRadius: 1,
    },
    filled: {
        backgroundColor: colors.accent,
    },
    unfilled: {
        backgroundColor: colors.surface,
    },
});
