import React from "react";
import { StyleSheet, View } from "react-native";

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
    bar: {
        borderRadius: 1,
        height: 14,
        width: 8,
    },
    container: {
        alignItems: "center",
        flexDirection: "row",
        gap: 3,
    },
    filled: {
        backgroundColor: colors.accent,
    },
    unfilled: {
        backgroundColor: colors.surface,
    },
});
