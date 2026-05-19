import React from "react";
import {
    ActivityIndicator,
    Image,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, typography } from "../theme";

interface ImagePreviewModalProps {
    fileName: string;
    fileSizeLabel: string;
    imageUri: null | string;
    onClose: () => void;
    onShare: () => void;
    sharing: boolean;
    visible: boolean;
}

export function ImagePreviewModal({
    fileName,
    fileSizeLabel,
    imageUri,
    onClose,
    onShare,
    sharing,
    visible,
}: ImagePreviewModalProps) {
    const insets = useSafeAreaInsets();

    return (
        <Modal
            animationType="fade"
            onRequestClose={onClose}
            transparent
            visible={visible && imageUri !== null}
        >
            <View style={styles.backdrop}>
                <View
                    style={[
                        styles.header,
                        { paddingTop: Math.max(insets.top + 12, 48) },
                    ]}
                >
                    <Pressable
                        accessibilityLabel="Close image preview"
                        accessibilityRole="button"
                        hitSlop={8}
                        onPress={onClose}
                        style={({ pressed }) => [
                            styles.iconButton,
                            pressed && styles.iconButtonPressed,
                        ]}
                    >
                        <Ionicons
                            color={colors.textSecondary}
                            name="close"
                            size={22}
                        />
                    </Pressable>
                    <View style={styles.meta}>
                        <Text numberOfLines={1} style={styles.fileName}>
                            {fileName}
                        </Text>
                        <Text style={styles.fileSize}>{fileSizeLabel}</Text>
                    </View>
                    <Pressable
                        accessibilityLabel="Share image"
                        accessibilityRole="button"
                        disabled={sharing}
                        hitSlop={8}
                        onPress={onShare}
                        style={({ pressed }) => [
                            styles.iconButton,
                            pressed && styles.iconButtonPressed,
                            sharing && styles.iconButtonDisabled,
                        ]}
                    >
                        {sharing ? (
                            <ActivityIndicator
                                color={colors.textSecondary}
                                size="small"
                            />
                        ) : (
                            <Ionicons
                                color={colors.textSecondary}
                                name="share-outline"
                                size={20}
                            />
                        )}
                    </Pressable>
                </View>
                <View style={styles.imageStage}>
                    {imageUri ? (
                        <Image
                            resizeMode="contain"
                            source={{ uri: imageUri }}
                            style={styles.image}
                        />
                    ) : null}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        backgroundColor: "rgba(0,0,0,0.94)",
        flex: 1,
    },
    fileName: {
        ...typography.body,
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: "600",
    },
    fileSize: {
        ...typography.body,
        color: colors.muted,
        fontSize: 11,
    },
    header: {
        alignItems: "center",
        flexDirection: "row",
        gap: 12,
        paddingBottom: 12,
        paddingHorizontal: 14,
    },
    iconButton: {
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.08)",
        borderColor: "rgba(255,255,255,0.12)",
        borderRadius: 999,
        borderWidth: 1,
        height: 40,
        justifyContent: "center",
        width: 40,
    },
    iconButtonDisabled: {
        opacity: 0.55,
    },
    iconButtonPressed: {
        backgroundColor: "rgba(255,255,255,0.16)",
    },
    image: {
        height: "100%",
        width: "100%",
    },
    imageStage: {
        alignItems: "center",
        flex: 1,
        justifyContent: "center",
        paddingBottom: 24,
    },
    meta: {
        flex: 1,
        minWidth: 0,
    },
});
