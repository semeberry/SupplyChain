;; Supply Chain Finance Platform Contracts

;; 1. Invoice Management Contract
(define-data-var invoice-count uint u0)

(define-map invoices
  { invoice-id: uint }
  {
    seller: principal,
    buyer: principal,
    amount: uint,
    status: (string-ascii 20),
    due-date: uint,
    collateral-amount: uint
  }
)

;; Create a new invoice
(define-public (create-invoice
  (buyer principal)
  (amount uint)
  (due-date uint)
  (collateral-amount uint)
)
  (let
    (
      (invoice-id (var-get invoice-count))
      (new-invoice
        {
          seller: tx-sender,
          buyer: buyer,
          amount: amount,
          status: "PENDING",
          due-date: due-date,
          collateral-amount: collateral-amount
        }
      )
    )
    (var-set invoice-count (+ invoice-count u1))
    (map-set invoices { invoice-id: invoice-id } new-invoice)
    (ok invoice-id)
  )
)

