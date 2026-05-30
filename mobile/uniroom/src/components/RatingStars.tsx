import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface RatingStarsProps {
    rating: number;
    maxStars?: number;
    size?: number;
    color?: string;
    onChange?: (rating: number) => void;
    readonly?: boolean;
}

export const RatingStars = ({ 
    rating, 
    maxStars = 5, 
    size = 25, 
    color = "#f39c12",
    onChange,
    readonly = true
}: RatingStarsProps) => {

    const renderStars = () => {
        const stars = [];
        for (let i = 1; i <= maxStars; i++) {
            let iconName: "star" | "star-outline" | "star-half" = "star-outline";

            if (readonly) {
                if (i <= Math.floor(rating)) {
                    iconName = "star";
                } else if (i === Math.ceil(rating) && rating % 1 !== 0) {
                    iconName = "star-half";
                }
            } else {
                if (i <= rating) {
                    iconName = "star";
                }
            }

            const starElement = (
                <MaterialCommunityIcons
                    key={i}
                    name={iconName}
                    size={size}
                    color={readonly ? color : (i <= rating ? color : "#ccc")}
                />
            );

            if (readonly || !onChange) {
                stars.push(starElement);
            } else {
                stars.push(
                    <TouchableOpacity key={i} onPress={() => onChange(i)}>
                        {starElement}
                    </TouchableOpacity>
                );
            }
        }
        return stars;
    };

    return (
        <View style={styles.container}>
            {renderStars()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        gap: 2,
    }
});
