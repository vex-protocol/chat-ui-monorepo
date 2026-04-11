import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

import { useNavigation } from "@react-navigation/native";

import { colors } from "../theme";

import { CornerBracketBox } from "./CornerBracketBox";

interface BackButtonProps {
    onPress?: () => void;
}

export function BackButton({ onPress }: BackButtonProps) {
    const navigation = useNavigation();

    return (
        <CornerBracketBox color={colors.border} size={6}>
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={
                    onPress ??
                    (() => {
                        navigation.goBack();
                    })
                }
                style={styles.button}
            >
                <Text style={styles.arrow}>←</Text>
            </TouchableOpacity>
        </CornerBracketBox>
    );
}

const styles = StyleSheet.create({
    arrow: {
        color: colors.text,
        fontSize: 20,
    },
    button: {
        alignItems: "center",
        borderColor: colors.border,
        borderWidth: 1,
        height: 50,
        justifyContent: "center",
        width: 50,
    },
});
