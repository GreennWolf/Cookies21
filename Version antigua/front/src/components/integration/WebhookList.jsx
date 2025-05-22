import React from 'react';
import PropTypes from 'prop-types';
import WebhookCard from './WebhookCard';

const WebhookList = ({ webhooks, onTestWebhook }) => {
  if (!webhooks || webhooks.length === 0) {
    return (
      <div className="text-center py-6 bg-gray-50 rounded-lg">
        <p className="text-gray-600">No hay webhooks configurados.</p>
        <p className="text-sm text-gray-500 mt-1">
          Los webhooks te permiten recibir notificaciones en tiempo real cuando ocurren eventos.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {webhooks.map((webhook) => (
        <WebhookCard
          key={webhook.id || webhook._id}
          webhook={webhook}
          onTestWebhook={onTestWebhook}
        />
      ))}
    </div>
  );
};

WebhookList.propTypes = {
  webhooks: PropTypes.array,
  onTestWebhook: PropTypes.func.isRequired
};

export default WebhookList;