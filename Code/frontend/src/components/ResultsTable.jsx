import DecisionBadge from './DecisionBadge.jsx';

export default function ResultsTable({ items }) {
  return (
    <div className="table-wrap">
      <table>
        <caption className="sr-only">
          Compliance decision for each submitted trade, in submitted order
        </caption>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Portfolio</th>
            <th scope="col">Security</th>
            <th scope="col">Action</th>
            <th scope="col">Quantity</th>
            <th scope="col">Price</th>
            <th scope="col">Decision</th>
            <th scope="col">Reason</th>
          </tr>
        </thead>
        <tbody>
          {items.map(({ result, trade, index }) => (
            <tr key={index}>
              <th scope="row">{index + 1}</th>
              <td data-label="Portfolio">{trade.portfolio_id}</td>
              <td data-label="Security">{trade.security_id}</td>
              <td data-label="Action">{trade.action}</td>
              <td data-label="Quantity">{trade.quantity}</td>
              <td data-label="Price">{trade.price}</td>
              <td data-label="Decision"><DecisionBadge decision={result.decision} /></td>
              <td data-label="Reason">{result.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
