import React from "react";
import { View, StyleSheet, ImageBackground, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme";

const bgGrid = require("../assets/images/bg-grid.png");

interface ScreenLayoutProps {
    children: React.ReactNode;
    style?: ViewStyle;
    padded?: boolean;
}

export function ScreenLayout({
    children,
    style,
    padded = true,
}: ScreenLayoutProps) {
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.root}>
            <ImageBackground
                source={bgGrid}
                resizeMode="repeat"
                style={styles.background}
                imageStyle={styles.gridImage}
            >
                {/* Vignette overlay */}
                <View style={styles.vignette} />
                <View
                    style={[
                        styles.content,
                        padded && { paddingHorizontal: 24 },
                        {
                            paddingTop: insets.top + 16,
                            paddingBottom: insets.bottom + 16,
                        },
                        style,
                    ]}
                >
                    {children}
                </View>
            </ImageBackground>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    background: {
        flex: 1,
    },
    gridImage: {
        opacity: 0.15,
    },
    vignette: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.bg,
        opacity: 0.4,
    },
    content: {
        flex: 1,
        zIndex: 1,
    },
});
