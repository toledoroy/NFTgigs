// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";  //Track Token Supply      //This might be an overkill...  //TODO: Get rid of this!
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * This is a simple Offer Contract
 * Used to manage the sale lifecycle
 * Version 0.1
 */
// contract Offers is ERC1155 {
contract Offers is ERC1155Supply {

    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;     //Track Last Token ID 
    
    mapping(uint256 => string) private _tokenURIs;      // Mapping for token URIs

    mapping(uint256 => mapping(address => uint256)) private _balances;			// Mapping from token ID to account balances
    mapping(uint256 => mapping(address => uint256)) private _used;				// Mapping from token ID to account's Negative balances (Offers Redeemed)
    
    string[] public status_name = ['cancelled','requested','delivered','closed'];           //Status Names [0 - as cancelled]
    struct Order {
        uint8 status;
        //Request Stage
        address account;
        // string request_uri;
        //Delivery Stage
        // string delivery_uri;
        //Approval Stage
        // uint8 score;     //Review as an Event
        // string review_uri;
        
    }
    
    // mapping(uint256 => Order) _orders;       //? How to Save Offer IDs...?  [tokenId+]      // token_id => Orders
    mapping(uint256 => mapping(uint256 => Order)) private _orders;  // Track Individual Orders   // token_id => Order_id => Order
    // mapping(uint256 => uint256) public _orderCount;     //Track Last Order ID      // token_id => last_order_id
    // mapping(uint256 => Counters.Counter) private _orderCount;                   //Track Last Order ID      // token_id => last_order_id
    mapping(uint256 => uint256) private _orderCount;   
    mapping(uint256 => uint256) private _prices;     // Token Prices
    mapping(uint256 => uint256) private _deposits;   // Pending Payments (Escrow)
    mapping (uint256 => address) public _creators;
    mapping (uint256 => uint256) public _maxSupply;
    //  mapping(uint256 => uint256) private _totalSupply;   //Inherit From ERC1155Supply
    // Contract name
    string public name = 'Offers';
    // Contract symbol
    string public symbol = 'OFFER';


    //-- Modifiers

    /**
    * @dev Require msg.sender to be the creator of the token id
    */
    modifier creatorOnly(uint256 _id) {
        require(_creators[_id] == msg.sender, "Only Creators Can Call This Function");
        _;
    }

    /**
    * @dev Require msg.sender to own more than 0 of the token id
    */
    // modifier ownersOnly(uint256 _id) {
    //     require(balances[msg.sender][_id] > 0, "ERC1155Tradable#ownersOnly: ONLY_OWNERS_ALLOWED");
    //     _;
    // }

    
    //-- Events
    /**
     * New Offer Made
     */
    event _offer(uint256 indexed token_id, address account, string uri);        // File an Order
    /**
     * Offer Sold
     */
    event _sold(uint256 indexed token_id, address account);        // File an Order
    /**
     * Offer Request - New Order
     *  uint256 tokenId     //Token ID
     *  string URI          //Details URI
     *  address account     //Requesting Account
     */
    event _order(uint256 indexed token_id, uint256 order_id, address account, string uri);
    /**
     * Refund Issued
     */
    event _delivery(uint256 indexed token_id, uint256 order_id, string uri);                       // Refund Event

    /**
     * Refund Issued
     */
    // event _refund(uint256 indexed token_id, address account);                       // Refund Event
    /**
     * Review Posted
     */
    event _review(address provider, address customer, uint256 rating, string uri);     // Review Provider (rating + details URI)

    // mapping(uint256 => string) private _tokenURIs;   // Mapping for token URIs (Taken From ERC721)


    // _orders[token_id][account]


    constructor() ERC1155('') {
        // make(11, 'GOLD', "");
        // _mint(msg.sender, 0, 10**18, "");

    }


    /**
     * @dev Hook that is called before any token transfer. This includes minting
     * and burning, as well as batched variants.
     *
     * The same hook is called on both single and batched variants. For single
     * transfers, the length of the `id` and `amount` arrays will be 1.
     *
     * Calling conditions (for each `id` and `amount` pair):
     *
     * - When `from` and `to` are both non-zero, `amount` of ``from``'s tokens
     * of token type `id` will be  transferred to `to`.
     * - When `from` is zero, `amount` tokens of token type `id` will be minted
     * for `to`.
     * - when `to` is zero, `amount` of ``from``'s tokens of token type `id`
     * will be burned.
     * - `from` and `to` are never both zero.
     * - `ids` and `amounts` have the same, non-zero length.
     *
     * To learn more about hooks, head to xref:ROOT:extending-contracts.adoc#using-hooks[Using Hooks].
     */
    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
        ) internal virtual override {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }

    //-- Getters
    
    /**
     * Get Available (Unused) Balance (Credit)
     */
    function creditOf(address account, uint256 token_id) public view returns (uint256) {
        require (account != address(0), "credit query for the zero address");
        require (exists(token_id), "NONEXISTENT_TOKEN");
        
        // return ( _balances[token_id][account] - _used[token_id][account] );  //
        return ( balanceOf(account, token_id) - _used[token_id][account] );
    }
    // function credit(uint256 token_id) public view returns (uint256) {
    //     return creditOf(_msgSender(), token_id);
    // }

    /**
     * Balance Used
     */
    function usedBalanceOf(address account, uint256 token_id) public view returns (uint256) {
        require(account != address(0), "ERC1155: balance query for the zero address");
        return _used[token_id][account];
    }

    /**
     * Get Token URI
     */
    function tokenURI(uint256 token_id) public view returns (string memory) {
        require(exists(token_id), "NONEXISTENT_TOKEN");
        return _tokenURIs[token_id];
    }

    /**
     * Get Token Price
     */
    function price(uint256 token_id) public view returns (uint256) {
        return _prices[token_id];
    }

    /**
     * Get Pending Deposits
     */
    function tokenDeposits(uint256 token_id) public view returns (uint256) {
        require(exists(token_id), "NONEXISTENT_TOKEN");
        // require(_creators[token_id] == _msgSender(), "CREATOR_ONLY");        //Maybe?
        return _deposits[token_id];
    }

    /**
     * @dev Get Pending Deposits
     */
    function tokenSupplyAvailable(uint256 token_id) public view returns (uint256) {
        require(exists(token_id), "NONEXISTENT_TOKEN");
        return (_maxSupply[token_id] + 1 - totalSupply(token_id));  //+1 Because First Mint Doesn't Count (Offer)
    }

    /**
     * @dev Get Current Order Status
     */
    function status(uint256 token_id, uint256 order_id) public view returns (uint8) {
        //Validate
        require(existsOrder(token_id, order_id), "NONEXISTENT_ORDER");
        return _orders[token_id][order_id].status;
    }
    

    /**
     * Check if Order Exists by Checking Requesting Account's Address
     */
    function existsOrder(uint256 token_id, uint256 order_id) public view returns (bool) {
        return(exists(token_id) && _orders[token_id][order_id].account != address(0));
    }
    //-- Testing

    /** Inherit exist() from ERC1155Supply 
    * @dev Returns whether the specified token exists by checking to see if it has a creator
    * @param token_id uint256 ID of the token to query the existence of
    * @return bool whether the token exists
    */
    // function _exists(uint256 token_id) internal view returns (bool) {
    //     return _creators[token_id] != address(0);
    // }
    
    /**
     * @dev Make a New Offer
     */
    function sell(uint256 token_price, uint256 max_supply, string memory uri) public returns (uint256) {
        address maker = msg.sender; //? Should I Support Contracts as Makers? 
        // address maker = _msgSender();
        //Increment Token ID
        _tokenIds.increment();  //First is 1
        uint256 token_id = _tokenIds.current();
        //Validat New ID 
        // require(exists(token_id), "NONEXISTENT_TOKEN");     //Seems Unecessary...

        //Mint
        _mint(maker, token_id, 1, '');
        
        //Update Current Supply     //TODO: 'Make' Probably Shouldn't Count...
        // tokenSupply[token_id] = 1;   //Should Be Automatic

        //Set Token Max-Supply
        _maxSupply[token_id] = max_supply;
        //Set Token URI
        _tokenURIs[token_id] = uri;
        //Set Token Price
        _prices[token_id] = token_price;
        
        //Set Creator  (Hook?)
        _creators[token_id] = maker;

        //Event: Token URI
        if (bytes(uri).length > 0) {
            emit URI(uri, token_id);
        }

        return token_id;
    }

    /**
     * @dev Take an Existing Offer (Buy Units of an existing Offering token)
     */
    function buy(uint256 quantity, uint256 token_id) public payable {
        //Validat that Token Exists
        require(exists(token_id), "NONEXISTENT_TOKEN");
        //Validate Stock
        require((_maxSupply[token_id] - totalSupply(token_id)) > 0, "REQ_QTY_UNAVAILABLE");
        //Validate Deposit Amount
        require(msg.value == (_prices[token_id] * quantity), "PAYMENT_MISMATCH");
        //Record Deposit
        _deposits[token_id] += msg.value;
        //Mint Units of Existing Token
        _mint(msg.sender, token_id, quantity, '');
        // tokenSupply[token_id] = tokenSupply[token_id].add(quantity);      //Done Automatically
        //Event: New Sale
        emit _sold(token_id, msg.sender);
    }

    /**
     * @dev Make a Request for Service -- Order (Single)
     */
    function order(uint256 token_id, string memory request_uri) public {
        //Validate Credit (Spendable Balance)
        require(creditOf(msg.sender, token_id) > 0, "INSUFFICIENT_CREDIT");

        //Mark Used
        _used[token_id][msg.sender] += 1;
        //Increment Order ID
        _orderCount[token_id] += 1;
        //New Order ID
        uint256 order_id = _orderCount[token_id];

        //[DEV] Double Check that Order Doesn't Exist
        require(!existsOrder(token_id, order_id), "EXISTING_ORDER");

        //Init New Order
        _orders[token_id][order_id] = Order({
                status: 1,  //requested
                account: msg.sender
                // request_uri: request_uri,
                // delivery_uri: '',
                // review_uri: ''
            });

        //Event W/URI
        emit _order(token_id, order_id, msg.sender, request_uri);
    }

    //-- DEV

    /**
     * Deliver Order
     */
    function deliver(uint256 token_id, uint256 order_id, string memory delivery_uri) public {
        //Validate Order
        require(existsOrder(token_id, order_id), "NONEXISTENT_ORDER");

        //Validate Caller is Provider
        require(_msgSender() == _creators[token_id], "SELLER_ONLY");

        //Validate Status 'requested'
        require(_orders[token_id][order_id].status == 1, "WRONG_STAGE");

        //Set Status
        _orders[token_id][order_id].status = 2; //delivered

        //Event: Delivery 
        emit _delivery(token_id, order_id, delivery_uri);
    }

    /**
     * Approve Delivery & Review
     * @param rating [ scale of 1-10     0 to skip ]
     */
    function approve(uint256 token_id, uint256 order_id, uint256 rating, string memory review_uri) public payable {
        //Validate Order
        require(existsOrder(token_id, order_id), "NONEXISTENT_ORDER");
        
        //Validate Status 'delivered'
        require(_orders[token_id][order_id].status == 2, "WRONG_STAGE");

        //Validate Caller is Buyer
        require(_msgSender() == _orders[token_id][order_id].account, "BUYER_ONLY");

        //Set Status
        _orders[token_id][order_id].status = 2; //delivered
        
        //Transfer Funds (+ Tip) to Creator
        uint256 amount = _prices[token_id] + msg.value;
        payable(_creators[token_id]).transfer(amount);

        if(_msgSender() != _creators[token_id]){    //Can't Rate Oneself
            //Validate Rating
            if(rating < 1 || rating > 10){ rating = 0; } 
            //Event: Rate (if Not Creator)
            emit _review(_creators[token_id], _msgSender(), rating, review_uri);
        }
    }

    /** [TBD]
     * Request a Revision
     
    function revision(){

    }
    */
    /** [TBD]
     * Return unused Tokend
     
    function return(){

    }
    */
    /** [TBD]
     * Issue a Refund (Cancel Request)
    
    function refund(
        // address account, 
        uint256 token_id
        ) public {
        //TODO: Validate Offer Owner

        //Mark Unused
        // _used[token_id][_msgSender()] = _used[token_id][_msgSender()] - 1;
        _used[token_id][_msgSender()] -= 1;
        
        // ! CAVEAT: Which Offer is going to be cancelled ??  Need to track offers... 

    }
    */



    //-- TESTS


    /* 0-255
    uint8 public _a;
    function setA(uint8 a) public returns (uint8) {
        _a = a;
        return _a;
    }
    */
    /**
     * [DEV] Try Self Destruct
     */
    function selfDestruct(address _address) public { 
        selfdestruct(payable(_address)); 
    }

}
