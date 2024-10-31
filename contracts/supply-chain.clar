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

;; 2. Collateral Management Contract
(define-map collateral-deposits
  {
    invoice-id: uint,
    depositor: principal
  }
  {
    amount: uint,
    locked: bool
  }
)

;; Deposit collateral for an invoice
(define-public (deposit-collateral
  (invoice-id uint)
  (amount uint)
)
  (let
    (
      (invoice (unwrap! (map-get? invoices { invoice-id: invoice-id }) (err u1)))
      (is-valid-depositor
        (or
          (is-eq tx-sender (get seller invoice))
          (is-eq tx-sender (get buyer invoice))
        )
      )
    )
    (asserts! is-valid-depositor (err u2))
    (asserts! (>= amount (get collateral-amount invoice)) (err u3))

    (map-set collateral-deposits
      {
        invoice-id: invoice-id,
        depositor: tx-sender
      }
      {
        amount: amount,
        locked: true
      }
    )
    (ok true)
  )
)

;; 3. Payment Settlement Contract
(define-map payment-records
  { invoice-id: uint }
  {
    paid-amount: uint,
    payment-status: (string-ascii 20),
    payment-date: uint
  }
)

;; Process invoice payment
(define-public (process-payment
  (invoice-id uint)
  (payment-amount uint)
)
  (let
    (
      (invoice (unwrap! (map-get? invoices { invoice-id: invoice-id }) (err u1)))
      (is-buyer (is-eq tx-sender (get buyer invoice)))
    )
    (asserts! is-buyer (err u2))
    (asserts! (>= payment-amount (get amount invoice)) (err u3))

    ;; Update invoice status
    (map-set invoices
      { invoice-id: invoice-id }
      (merge invoice { status: "PAID" })
    )

    ;; Record payment
    (map-set payment-records
      { invoice-id: invoice-id }
      {
        paid-amount: payment-amount,
        payment-status: "COMPLETED",
        payment-date: block-height
      }
    )

    ;; Release collateral
    (map-delete collateral-deposits
      {
        invoice-id: invoice-id,
        depositor: (get buyer invoice)
      }
    )

    (ok true)
  )
)

;; 4. Dispute Resolution Contract
(define-map disputes
  { invoice-id: uint }
  {
    disputant: principal,
    reason: (string-ascii 100),
    status: (string-ascii 20)
  }
)

