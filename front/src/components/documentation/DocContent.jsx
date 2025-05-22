import React from 'react';
import { Card, Alert } from 'react-bootstrap';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Importar componentes específicos para cada sección
import GettingStarted from './sections/GettingStarted';
import ScriptIntegration from './sections/ScriptIntegration';
import BannerCustomization from './sections/BannerCustomization';
import Compliance from './sections/Compliance';
import Api from './sections/Api';
import Faq from './sections/Faq';

const DocContent = ({ section }) => {
  const renderContent = () => {
    switch (section) {
      case 'getting-started':
        return <GettingStarted />;
      case 'script-integration':
        return <ScriptIntegration />;
      case 'banner-customization':
        return <BannerCustomization />;
      case 'compliance':
        return <Compliance />;
      case 'api':
        return <Api />;
      case 'faq':
        return <Faq />;
      default:
        return <GettingStarted />;
    }
  };

  return (
    <div className="doc-content">
      {renderContent()}
    </div>
  );
};

export default DocContent;