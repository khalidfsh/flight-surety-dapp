
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async() => {

    let result = null;

    let contract = new Contract('localhost', () => {

        // Read transaction
        contract.isOperational((error, result) => {
            display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        });
    

        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('flight-number').value;
            // Write transaction
            contract.fetchFlightStatus(flight, (error, result) => {
                display(
                    'Oracles', 'Trigger oracles', 
                    [ 
                        { label: 'Fetch Flight Status', error: error, value: result.name + ' ' + result.departure }
                    ]
                );
            });
        })

        DOM.elid('buy-insurance').addEventListener('click', async () => {
            let flight = DOM.elid('flight-number').value;
            let ticket = DOM.elid('ticket-number').value;
            let amount = DOM.elid('purchase-amount').value;
            // Write transaction
            await contract.purchaseInsurance(flight, ticket, amount, (error, result) => {
                display(
                    'Insurance', 'Insurance purchase', 
                    [ 
                        { label: 'Flight number', error: error, value: result.flight.name + ' ' + result.flight.departure }, 
                        { label: 'Ticket Number',  value: result.ticket }, 
                    ]
                );

            });
        })

        DOM.elid('withdraw-insurance').addEventListener('click', async() => {
            let flight = DOM.elid('flight-number').value;
            let ticket = DOM.elid('ticket-number').value;
            // Write transaction
            await contract.withdrawCredit(flight, ticket, (error, result) => {
                display(
                    'Insurance', 'Insurance credit withdrow', 
                    [ 
                        { label: 'Flight number', error: error, value: result.flight.name + ' ' + result.flight.departure }, 
                        { label: 'Ticket Number',  value: result.ticket }, 
                    ]
                );
            });
        })
    
    });
    

})();


function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);

}







