import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';

const Home = () => {
    const { user, loading } = useAuth();

    if (loading) return <div>Loading...</div>;
    if (!user) return <div>Not logged in</div>;
    const handleLogout = async () => {
        await authService.logout();
    }

    return (
        <div>
            <h1>Welcome {user.displayName}</h1>
            <p>Role: {user.role}</p>
            <p>Email: {user.email}</p>
            <Button variant="primary" label="Logout" onClick={handleLogout} />
        </div>
    );

}

export default Home