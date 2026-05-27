import { useVideoPlayer, VideoView } from "expo-video"
import { Dimensions } from "react-native"
import { getMediaUri } from "../utils/getMediaUri"

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window")

export const GaleriaVideoItem = ({ src }: { src: string }) => {
    const player = useVideoPlayer(getMediaUri(src) as { uri: string })
    return (
        <VideoView
            player={player}
            style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.6 }}
            allowsFullscreen
        />
    )
}
