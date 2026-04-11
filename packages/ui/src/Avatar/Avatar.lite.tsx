import { useDefaultProps, useStore } from "@builder.io/mitosis";

export interface AvatarProps {
    alt?: string;
    className?: string;
    displayName?: string;
    size?: "lg" | "md" | "sm" | "xs" | number;
    src?: string;
    userID?: string;
}

export default function Avatar(props: AvatarProps) {
    useDefaultProps<AvatarProps>({
        alt: "",
        className: "",
        size: "md",
    });

    const state = useStore({
        get fallbackBg(): string {
            const id = props.userID;
            if (!id) return "hsl(0, 0%, 40%)";
            let h = 0;
            for (let i = 0; i < id.length; i++)
                h = (h * 31 + id.charCodeAt(i)) | 0;
            return `hsl(${Math.abs(h) % 360}, 45%, 40%)`;
        },
        handleError() {
            state.imgFailed = true;
        },
        imgFailed: false,
        get initials(): string {
            if (props.displayName)
                return props.displayName.slice(0, 2).toUpperCase();
            if (props.userID) return props.userID.slice(0, 2).toUpperCase();
            return "?";
        },
        get px(): number {
            const s = props.size;
            if (typeof s === "number") return s;
            if (s === "xs") return 20;
            if (s === "sm") return 28;
            if (s === "lg") return 48;
            return 36;
        },
    });

    return (
        <div
            class={`avatar ${props.className}`}
            style={{
                borderRadius: "50%",
                display: "inline-flex",
                flexShrink: "0",
                height: `${state.px}px`,
                overflow: "hidden",
                width: `${state.px}px`,
            }}
        >
            {props.src && !state.imgFailed ? (
                <img
                    alt={props.alt}
                    class="avatar__img"
                    height={state.px}
                    onError={() => {
                        state.handleError();
                    }}
                    src={props.src}
                    style={{
                        borderRadius: "50%",
                        height: "100%",
                        objectFit: "cover",
                        width: "100%",
                    }}
                    width={state.px}
                />
            ) : (
                <div
                    class="avatar__fallback"
                    style={{
                        alignItems: "center",
                        background: state.fallbackBg,
                        borderRadius: "50%",
                        color: "#fff",
                        display: "flex",
                        fontSize: `${Math.round(state.px * 0.4)}px`,
                        fontWeight: "700",
                        height: "100%",
                        justifyContent: "center",
                        letterSpacing: "0.02em",
                        userSelect: "none",
                        width: "100%",
                    }}
                >
                    {state.initials}
                </div>
            )}
        </div>
    );
}
