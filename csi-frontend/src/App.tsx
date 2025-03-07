import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import FormulaireDoctorant from './pages/FormulaireDoctorant';
import ListeDoctorants from './pages/ListeDoctorants';
import ModifierDoctorant from './pages/ModifierDoctorant';
import ModifierDoctorantAdmin from './pages/ModifierDoctorantAdmin';
import Header from './components/Header';
import EnvoiEmail from './pages/sendEmail';
import FormulaireToken from './pages/FormulaireToken';
import FormulaireRepresentant from './pages/FormulaireRepresentant';

const App: React.FC = () => {
    return (
        <Router>
          <Header />
            <Routes>
                <Route path="/" element={<EnvoiEmail />} />
                <Route path="/doctorants" element={<ListeDoctorants />} />
                <Route path="/modifier/:id" element={<ModifierDoctorant />} />
                <Route path="/formulaire" element={<FormulaireToken />} />
                <Route path="/formulaire-representant" element={<FormulaireRepresentant />} />
                <Route path="/doctorant/modifier/:id" element={<ModifierDoctorantAdmin />} />
            </Routes>
        </Router>
    );
};

export default App;