import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { BackButton } from "../components/BackButton";
import { CornerBracketBox } from "../components/CornerBracketBox";
import { ScreenLayout } from "../components/ScreenLayout";
import { VexButton } from "../components/VexButton";
import { colors, typography } from "../theme";

type Props = NativeStackScreenProps<any, "Authenticate">;

const CODE_LENGTH = 6;
const EXPIRY_SECONDS = 5 * 60;

export function AuthenticateScreen({ navigation: _navigation }: Props) {
    const [code, setCode] = useState("");
    const [secondsLeft, setSecondsLeft] = useState(EXPIRY_SECONDS);
    const inputRef = useRef<TextInput>(null);

    useEffect(() => {
        const timer = setInterval(() => {
            setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
        }, 1000);
        return () => { clearInterval(timer); };
    }, []);

    const minutes = Math.floor(secondsLeft / 60)
        .toString()
        .padStart(2, "0");
    const seconds = (secondsLeft % 60).toString().padStart(2, "0");

    const handleConfirm = () => {
        // TODO: verify code with server
    };

    return (
        <ScreenLayout>
            <BackButton />

            <View style={styles.content}>
                <Text style={styles.label}>VERIFICATION REQUIRED</Text>
                <Text style={styles.heading}>Authenticate.</Text>

                {/* Code cells */}
                <View style={styles.codeRow}>
                    {Array.from({ length: CODE_LENGTH }).map((_, i) => {
                        const filled = i < code.length;
                        return (
                            <CornerBracketBox
                                color={filled ? colors.accent : colors.border}
                                key={i}
                                size={6}
                            >
                                <View
                                    style={[
                                        styles.cell,
                                        filled && styles.cellFilled,
                                    ]}
                                >
                                    <Text style={styles.cellText}>
                                        {code[i] ?? ""}
                                    </Text>
                                </View>
                            </CornerBracketBox>
                        );
                    })}
                </View>

                {/* Hidden input */}
                <TextInput
                    autoFocus
                    keyboardType="number-pad"
                    maxLength={CODE_LENGTH}
                    onChangeText={(t) => { setCode(t.slice(0, CODE_LENGTH)); }}
                    ref={inputRef}
                    style={styles.hiddenInput}
                    value={code}
                />

                <Text style={styles.timer}>
                    Expires in: {minutes}:{seconds}
                </Text>

                <VexButton
                    disabled={code.length < CODE_LENGTH}
                    onPress={handleConfirm}
                    title="Confirm Identity"
                />

                <View style={styles.links}>
                    <Text style={styles.link}>Resend verification code</Text>
                    <Text style={styles.link}>Try another way</Text>
                </View>
            </View>
        </ScreenLayout>
    );
}

const styles = StyleSheet.create({
    cell: {
        alignItems: "center",
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        height: 56,
        justifyContent: "center",
        width: 48,
    },
    cellFilled: {
        borderColor: colors.accent,
    },
    cellText: {
        ...typography.headingSmall,
        color: colors.text,
        fontSize: 24,
    },
    codeRow: {
        flexDirection: "row",
        gap: 10,
        justifyContent: "center",
        marginVertical: 16,
    },
    content: {
        flex: 1,
        gap: 20,
        marginTop: 32,
    },
    heading: {
        ...typography.heading,
        color: colors.text,
    },
    hiddenInput: {
        height: 0,
        opacity: 0,
        position: "absolute",
    },
    label: {
        ...typography.label,
        color: colors.muted,
    },
    link: {
        ...typography.body,
        color: colors.muted,
    },
    links: {
        alignItems: "center",
        gap: 12,
        marginTop: 8,
    },
    timer: {
        ...typography.body,
        color: colors.muted,
        textAlign: "center",
    },
});
