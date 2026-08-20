import { useEffect } from 'react';
import { socket } from '../../services/socket';

const GuardianEmergencyListener = ({ user }) => {
    useEffect(() => {
        if (!user?._id) return;


        socket.emit('JOIN_USER_ROOM', user._id);

        console.log(
            `[Socket] Joined user room: user_${user._id}`
        );

        const handleEmergency = (data) => {
            console.log('EMERGENCY ALERT RECEIVED');
            console.log(data);


            if (
                'Notification' in window &&
                Notification.permission === 'granted'
            ) {
                new Notification(data.title, {
                    body: data.message,
                });
            }
        };

        socket.on(
            'EMERGENCY_ALERT',
            handleEmergency
        );

        return () => {
            socket.off(
                'EMERGENCY_ALERT',
                handleEmergency
            );
        };
    }, [user?._id]);

    return null;
};

export default GuardianEmergencyListener;