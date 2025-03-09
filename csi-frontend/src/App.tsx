import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext'; // Ajoute AuthProvider
import PrivateRoute from './components/PrivateRoute'; // Ajoute PrivateRoute
import FormulaireDoctorant from './pages/FormulaireDoctorant';
import ListeDoctorants from './pages/ListeDoctorants';
import ModifierDoctorant from './pages/ModifierDoctorant';
import ModifierDoctorantAdmin from './pages/ModifierDoctorantAdmin';
import Header from './components/Header';
import EnvoiEmail from './pages/sendEmail';
import FormulaireToken from './pages/FormulaireToken';
import FormulaireRepresentant from './pages/FormulaireRepresentant';
import Login from './components/Login';
import AdminEmailConfig from './pages/AdminEmailConfig';
import MerciPage from './pages/MerciPage';

const App: React.FC = () => {
    const { isAdmin } = useAuth();
    return (
            <Router>
                {isAdmin && <Header />}
                <Routes>
                    {/* Accès Public */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/formulaire" element={<FormulaireToken />} />
                    {/* <Route path="/formulaire-representant" element={<FormulaireRepresentant />} /> */}
                    <Route path="/modifier/:id" element={<ModifierDoctorant />} />
                    <Route path="/merci" element={<MerciPage />} />

                    {/* Routes Admin Sécurisées */}
                    <Route element={<PrivateRoute />}>
                        <Route path="/" element={<EnvoiEmail />} />
                        <Route path="/doctorants" element={<ListeDoctorants />} />
                        <Route path="/doctorant/modifier/:id" element={<ModifierDoctorantAdmin />} />
                        <Route path='/email-config' element={<AdminEmailConfig />} />
                    </Route>
                </Routes>
            </Router>
    );
};

export default App;