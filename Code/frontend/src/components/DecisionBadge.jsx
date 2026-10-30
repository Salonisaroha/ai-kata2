import { DECISIONS } from '../api/apiClient.js';
import { AlertIcon, CheckIcon, CrossIcon } from './Icons.jsx';

// Text + icon + color; branches on `decision` only.
const STYLES = {
  [DECISIONS.APPROVED]: { cls: 'approved', Icon: CheckIcon },
  [DECISIONS.REJECTED]: { cls: 'rejected', Icon: CrossIcon },
  [DECISIONS.MANUAL]: { cls: 'manual', Icon: AlertIcon },
};

export default function DecisionBadge({ decision }) {
  const { cls, Icon } = STYLES[decision];
  return (
    <span className={`badge badge-${cls}`}>
      <Icon className="badge-icon" width={14} height={14} />
      {decision}
    </span>
  );
}
