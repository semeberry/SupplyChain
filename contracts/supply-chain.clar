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

