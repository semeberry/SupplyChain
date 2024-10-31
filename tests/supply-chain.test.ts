import { describe, it, expect, beforeEach } from 'vitest';
import {
  Clarinet,
  Tx,
  types,
} from '@hirosystems/clarinet-sdk';

describe('Supply Chain Finance Smart Contracts', () => {
  // Invoice Management Tests
  describe('Invoice Creation', () => {
    it('should create a new invoice successfully', (context) => {
      const session = new Clarinet.Session(context);
      
      const buyer = session.createAccount('buyer');
      const seller = session.createAccount('seller');
      
      const block = session.chain.mineBlock([
        Tx.contractCall(
            'supply-chain-finance',
            'create-invoice',
            [
              types.principal(buyer.address),
              types.uint(1000),
              types.uint(30),  // due date
              types.uint(100)  // collateral amount
            ],
            seller.address
        )
      ]);
      
      // Assert transaction success
      block.receipts[0].result.expectOk();
      
      // Verify invoice details
      const invoiceId = block.receipts[0].result.expectOk();
      const invoiceDetails = session.chain.callReadOnlyFn(
          'supply-chain-finance',
          'get-invoice-status',
          [invoiceId],
          seller.address
      );
      
      invoiceDetails.result.expectSome();
    });
    
    it('should prevent creating invoice with invalid parameters', (context) => {
      const session = new Clarinet.Session(context);
      
      const buyer = session.createAccount('buyer');
      const seller = session.createAccount('seller');
      
      const block = session.chain.mineBlock([
        Tx.contractCall(
            'supply-chain-finance',
            'create-invoice',
            [
              types.principal(buyer.address),
              types.uint(0),  // Invalid amount
              types.uint(30),
              types.uint(100)
            ],
            seller.address
        )
      ]);
      
      // Assert transaction failure
      block.receipts[0].result.expectErr();
    });
  });
  
  // Collateral Management Tests
  describe('Collateral Deposit', () => {
    it('should allow valid collateral deposit', (context) => {
      const session = new Clarinet.Session(context);
      
      const buyer = session.createAccount('buyer');
      const seller = session.createAccount('seller');
      
      // First, create an invoice
      const createInvoiceBlock = session.chain.mineBlock([
        Tx.contractCall(
            'supply-chain-finance',
            'create-invoice',
            [
              types.principal(buyer.address),
              types.uint(1000),
              types.uint(30),
              types.uint(100)
            ],
            seller.address
        )
      ]);
      
      const invoiceId = createInvoiceBlock.receipts[0].result.expectOk();
      
      // Then deposit collateral
      const depositBlock = session.chain.mineBlock([
        Tx.contractCall(
            'supply-chain-finance',
            'deposit-collateral',
            [
              invoiceId,
              types.uint(100)
            ],
            buyer.address
        )
      ]);
      
      depositBlock.receipts[0].result.expectOk();
    });
    
    it('should prevent insufficient collateral deposit', (context) => {
      const session = new Clarinet.Session(context);
      
      const buyer = session.createAccount('buyer');
      const seller = session.createAccount('seller');
      
      // Create an invoice
      const createInvoiceBlock = session.chain.mineBlock([
        Tx.contractCall(
            'supply-chain-finance',
            'create-invoice',
            [
              types.principal(buyer.address),
              types.uint(1000),
              types.uint(30),
              types.uint(100)
            ],
            seller.address
        )
      ]);
      
      const invoiceId = createInvoiceBlock.receipts[0].result.expectOk();
      
      // Attempt to deposit insufficient collateral
      const depositBlock = session.chain.mineBlock([
        Tx.contractCall(
            'supply-chain-finance',
            'deposit-collateral',
            [
              invoiceId,
              types.uint(50)  // Less than required
            ],
            buyer.address
        )
      ]);
      
      depositBlock.receipts[0].result.expectErr();
    });
  });
  
  // Payment Settlement Tests
  describe('Payment Processing', () => {
    it('should process payment successfully', (context) => {
      const session = new Clarinet.Session(context);
      
      const buyer = session.createAccount('buyer');
      const seller = session.createAccount('seller');
      
      // Create invoice
      const createInvoiceBlock = session.chain.mineBlock([
        Tx.contractCall(
            'supply-chain-finance',
            'create-invoice',
            [
              types.principal(buyer.address),
              types.uint(1000),
              types.uint(30),
              types.uint(100)
            ],
            seller.address
        )
      ]);
      
      const invoiceId = createInvoiceBlock.receipts[0].result.expectOk();
      
      // Deposit collateral
      const depositBlock = session.chain.mineBlock([
        Tx.contractCall(
            'supply-chain-finance',
            'deposit-collateral',
            [
              invoiceId,
              types.uint(100)
            ],
            buyer.address
        )
      ]);
      
      // Process payment
      const paymentBlock = session.chain.mineBlock([
        Tx.contractCall(
            'supply-chain-finance',
            'process-payment',
            [
              invoiceId,
              types.uint(1000)
            ],
            buyer.address
        )
      ]);
      
      paymentBlock.receipts[0].result.expectOk();
      
      // Verify invoice status
      const invoiceStatus = session.chain.callReadOnlyFn(
          'supply-chain-finance',
          'get-invoice-status',
          [invoiceId],
          buyer.address
      );
      
      // Check if invoice status is updated to PAID
      const statusSome = invoiceStatus.result.expectSome();
      expect(statusSome.data.status).toBe('PAID');
    });
    
    it('should prevent payment from non-buyer', (context) => {
      const session = new Clarinet.Session(context);
      
      const buyer = session.createAccount('buyer');
      const seller = session.createAccount('seller');
      const randomAccount = session.createAccount('random');
      
      // Create invoice
      const createInvoiceBlock = session.chain.mineBlock([
        Tx.contractCall(
            'supply-chain-finance',
            'create-invoice',
            [
              types.principal(buyer.address),
              types.uint(1000),
              types.uint(30),
              types.uint(100)
            ],
            seller.address
        )
      ]);
      
      const invoiceId = createInvoiceBlock.receipts[0].result.expectOk();
      
      // Attempt payment from non-buyer
      const paymentBlock = session.chain.mineBlock([
        Tx.contractCall(
            'supply-chain-finance',
            'process-payment',
            [
              invoiceId,
              types.uint(1000)
            ],
            randomAccount.address
        )
      ]);
      
      paymentBlock.receipts[0].result.expectErr();
    });
  });
  
  // Dispute Resolution Tests
  describe('Dispute Management', () => {
    it('should initiate dispute successfully', (context) => {
      const session = new Clarinet.Session(context);
      
      const buyer = session.createAccount('buyer');
      const seller = session.createAccount('seller');
      
      // Create invoice
      const createInvoiceBlock = session.chain.mineBlock([
        Tx.contractCall(
            'supply-chain-finance',
            'create-invoice',
            [
              types.principal(buyer.address),
              types.uint(1000),
              types.uint(30),
              types.uint(100)
            ],
            seller.address
        )
      ]);
      
      const invoiceId = createInvoiceBlock.receipts[0].result.expectOk();
      
      // Initiate dispute
      const disputeBlock = session.chain.mineBlock([
        Tx.contractCall(
            'supply-chain-finance',
            'initiate-dispute',
            [
              invoiceId,
              types.ascii('Quality issues with delivered goods')
            ],
            buyer.address
        )
      ]);
      
      disputeBlock.receipts[0].result.expectOk();
    });
    
    it('should resolve dispute with valid resolution', (context) => {
      const session = new Clarinet.Session(context);
      
      const buyer = session.createAccount('buyer');
      const seller = session.createAccount('seller');
      
      // Create invoice
      const createInvoiceBlock = session.chain.mineBlock([
        Tx.contractCall(
            'supply-chain-finance',
            'create-invoice',
            [
              types.principal(buyer.address),
              types.uint(1000),
              types.uint(30),
              types.uint(100)
            ],
            seller.address
        )
      ]);
      
      const invoiceId = createInvoiceBlock.receipts[0].result.expectOk();
      
      // Initiate dispute
      const disputeBlock = session.chain.mineBlock([
        Tx.contractCall(
            'supply-chain-finance',
            'initiate-dispute',
            [
              invoiceId,
              types.ascii('Quality issues with delivered goods')
            ],
            buyer.address
        )
      ]);
      
      // Resolve dispute
      const resolveBlock = session.chain.mineBlock([
        Tx.contractCall(
            'supply-chain-finance',
            'resolve-dispute',
            [
              invoiceId,
              types.ascii('SELLER_WINS')
            ],
            seller.address
        )
      ]);
      
      resolveBlock.receipts[0].result.expectOk();
    });
  });
});

// Utility Test Configuration
describe('Supply Chain Finance - Configuration', () => {
  it('should have correct initial state', (context) => {
    const session = new Clarinet.Session(context);
    
    // Verify initial invoice count is zero
    const invoiceCount = session.chain.callReadOnlyFn(
        'supply-chain-finance',
        'invoice-count',
        [],
        session.deployer.address
    );
    
    expect(invoiceCount.result).toBe('u0');
  });
});

// Error Handling and Edge Cases
describe('Supply Chain Finance - Error Scenarios', () => {
  it('should handle non-existent invoice gracefully', (context) => {
    const session = new Clarinet.Session(context);
    
    const buyer = session.createAccount('buyer');
    
    // Attempt to process payment for non-existent invoice
    const paymentBlock = session.chain.mineBlock([
      Tx.contractCall(
          'supply-chain-finance',
          'process-payment',
          [
            types.uint(9999),  // Non-existent invoice ID
            types.uint(1000)
          ],
          buyer.address
      )
    ]);
    
    paymentBlock.receipts[0].result.expectErr();
  });
});
