import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../theme";
import { CornerBracketBox } from "./CornerBracketBox";

interface BackButtonProps {
    onPress?: () => void;
}

export function BackButton({ onPress }: BackButtonProps) {
    const navigation = useNavigation();

    return (
        <CornerBracketBox size={6} color={colors.border}>
            <TouchableOpacity
                onPress={onPress ?? (() => navigation.goBack())}
                activeOpacity={0.7}
                style={styles.button}
            >
                <Text style={styles.arrow}>←</Text>
            </TouchableOpacity>
        </CornerBracketBox>
    );
}

const styles = StyleSheet.create({
    button: {
        width: 50,
        height: 50,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: colors.border,
    },
    arrow: {
        color: colors.text,
        fontSize: 20,
    },
});
